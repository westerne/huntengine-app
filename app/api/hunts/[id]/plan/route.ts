/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { applyChange } from '@/lib/hunts';
import { buildPlanPrompt, cleanPlan, parseInputs, type PlanContext } from '@/lib/plans';
import { lessonsBlock, type PastReport } from '@/lib/reports';
import { STATE_INFO, toStateCode } from '@/lib/huntdata/registry';
import { harvestForHunt } from '@/lib/huntdata/harvest';
import { officialInfoFor } from '@/lib/huntdata/applicationInfo';
import { getAccessSummary } from '@/lib/access';
import { getPublicLandPct, getUnitCentroid } from '@/lib/landstats';
import type { SpeciesKey } from '@/lib/huntdata/schema';

// POST /api/hunts/:id/plan — generate "Your Hunt Plan" from the hunter's inputs.
// Every generation becomes a new version. It becomes current only if the
// current plan has no edits; otherwise the hunter chooses (never silently
// overwritten). Gear becomes the hunt's prep checklist the first time.

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

const SPECIES_KEY: Record<string, SpeciesKey> = {
  'Deer': 'DEER', 'Mule Deer': 'DEER', 'Elk': 'ELK', 'Antelope': 'ANTELOPE', 'Moose': 'MOOSE', 'Bighorn Sheep': 'BIGHORNSHEEP', 'Mountain Goat': 'MTNGOAT',
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

export async function POST(req: Request, { params }: Ctx) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const parsed = parseInputs(body);
  if ('errors' in parsed) return NextResponse.json({ error: 'Check the highlighted fields.', fields: parsed.errors }, { status: 400 });
  const { inputs } = parsed;

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) return NextResponse.json({ error: 'Hunt not found.' }, { status: 404 });
  if (!['tag_secured', 'preparing'].includes(hunt.status)) {
    return NextResponse.json({ error: 'Hunt plans are for hunts with a tag secured.' }, { status: 409 });
  }

  // ── Grounding: only data we actually have ──────────────────────────────
  const code = toStateCode(hunt.state);
  const info = code ? STATE_INFO[code] : null;
  const sk = SPECIES_KEY[hunt.species];
  const unitForMaps = String(hunt.unit).split('-')[0];
  const h = code && sk ? harvestForHunt(code, sk, hunt.hunt_code ?? hunt.unit, unitForMaps) : null;
  const origin = new URL(req.url).origin;
  const [centroid, land] = await Promise.all([
    withTimeout(getUnitCentroid(origin, hunt.state, hunt.species, hunt.unit), 6000, null),
    withTimeout(getPublicLandPct(origin, hunt.state, hunt.species, hunt.unit), 8000, null),
  ]);
  const access = centroid ? await withTimeout(getAccessSummary(centroid.lat, centroid.lng), 8000, null) : null;
  const official = officialInfoFor(hunt.state, hunt.species, hunt.season_year);
  // The hunter's own finished reports from other hunts (RLS: theirs only).
  const { data: pastRows } = await supabase.from('hunt_reports')
    .select('harvested, days_hunted, pressure, worked, didnt_work, change_next, access_issues, conditions, saved_hunts!inner(id, season_year, state, species, unit, hunt_code)')
    .not('completed_at', 'is', null).neq('hunt_id', id);
  const past: PastReport[] = (pastRows ?? []).map((r: any) => ({ ...r.saved_hunts, report: r }));

  const ctx: PlanContext = {
    state: hunt.state,
    stateName: info?.name ?? hunt.state,
    species: hunt.species,
    unit: hunt.unit,
    huntCode: hunt.hunt_code,
    label: hunt.label,
    seasonYear: hunt.season_year,
    agencyName: info?.agency.name ?? `${hunt.state} wildlife agency`,
    agencyUrl: info?.agency.url ?? '',
    regulationsUrl: official.datesPageUrl,
    harvest: h ? `${h.successPct}% hunter success (${h.year}${h.scope === 'unit' ? ', unit-wide' : ''})` : null,
    publicLand: land?.publicPct != null ? `about ${land.publicPct}% public land (sampled from BLM land status)` : null,
    access: access?.text?.trim() || null,
    lessons: lessonsBlock(past, hunt),
  };

  // ── Generate ───────────────────────────────────────────────────────────
  let generated;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: buildPlanPrompt(ctx, inputs) }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    generated = cleanPlan(JSON.parse(res.choices[0].message.content || '{}'));
  } catch {
    // Nothing saved; the form keeps everything the hunter typed.
    return NextResponse.json({ error: 'The plan couldn’t be generated just now. Your answers are kept — try again.' }, { status: 502 });
  }

  // ── Save: dates on the hunt, a new plan version ────────────────────────
  const huntPatch: Record<string, unknown> = { hunt_start: inputs.hunt_start, hunt_end: inputs.hunt_end };
  if (hunt.status === 'tag_secured') {
    const next = applyChange(hunt, { status: 'preparing' });
    if (!('error' in next)) Object.assign(huntPatch, next);
  }
  const { data: updatedHunt } = await supabase.from('saved_hunts').update(huntPatch).eq('id', id).select('*').single();

  const { data: current } = await supabase.from('hunt_plans').select('id, edited, version').eq('hunt_id', id).eq('is_current', true).maybeSingle();
  const { data: last } = await supabase.from('hunt_plans').select('version').eq('hunt_id', id).order('version', { ascending: false }).limit(1).maybeSingle();
  const hasEdits = !!current && Object.keys(current.edited ?? {}).length > 0;
  const makeCurrent = !hasEdits;
  if (makeCurrent && current) await supabase.from('hunt_plans').update({ is_current: false }).eq('id', current.id);

  const { data: plan, error } = await supabase.from('hunt_plans').insert({
    hunt_id: id, user_id: auth.viewer.userId, version: (last?.version ?? 0) + 1,
    inputs, generated, is_current: makeCurrent, model: 'gpt-4o',
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'The plan was generated but couldn’t be saved. Try again.' }, { status: 500 });

  // Gear → prep checklist, only the first time (later versions don't touch it).
  const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('hunt_id', id).eq('kind', 'prep');
  if (!count && generated.gear.length) {
    await supabase.from('tasks').insert(generated.gear.map((g, i) => ({
      user_id: auth.viewer.userId, hunt_id: id, kind: 'prep', title: g.item, position: i,
      state: hunt.state, species: hunt.species, season_year: hunt.season_year,
      due_on: inputs.hunt_start ?? null,
    })));
  }
  const { data: prepTasks } = await supabase.from('tasks').select('*').eq('hunt_id', id).eq('kind', 'prep').order('position');

  return NextResponse.json({ plan, hunt: updatedHunt ?? hunt, tasks: prepTasks ?? [], pendingChoice: !makeCurrent });
}
