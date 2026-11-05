import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireMember } from '@/lib/apiAuth';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { asWeapon, loadDrawContext } from '@/lib/huntdata/drawContext';
import { drawReality } from '@/lib/huntdata/reality';
import { cutoffIsADate, pointsBarMatters } from '@/lib/huntdata/drawSystem';
import { currentSeasonYear } from '@/lib/hunts';
import {
  BLIND_SPOTS, WANTS, WANT_KEYS, BLIND_SPOT_KEYS,
  cohortOf, isBlindSpot, isWantKey, rankByWants, seasonText,
  type BlindSpot, type WantKey,
} from '@/lib/huntdata/wants';
import { isAntlerless, oddsOf } from '@/lib/huntdata/shortlist';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/huntdata/narrow  { state, species, weapon?, text }
//
// Step 3 of Find a Hunt. The hunter describes the hunt he wants in his own
// words; the model's only job is to read that and pick from two closed lists —
// the things the draw data can answer, and the things it can't. Ranking, every
// percentage and every date after that are computed from the agency's figures,
// so there is nothing here for the model to get wrong about a hunt.
//
// Deliberately NOT asked of the model: which unit to pick, what the odds are,
// how big the bulls are. It reads English; the data decides.

const MAX_TEXT = 600;

const SYSTEM = `You read a hunter's description of the hunt he wants and translate it into two lists of keys. You never choose hunts, quote odds, or add facts.

WANTS — pick every key he clearly asked for, and nothing he didn't:
${WANT_KEYS.map((k) => `  ${k} — ${WANTS[k].asked}`).join('\n')}

Rules for WANTS:
- Only what he actually said or plainly implied. Saying "September" for elk implies rut; saying "I have a bow" implies archery. Wanting a big bull does NOT imply antleredOnly unless he asked for a bull or buck tag.
- archery, rifle and muzzleloader are exclusive — pick at most one.
- early and late are exclusive — pick at most one.
- antleredOnly and anyAnimal are exclusive — pick at most one.
- If he said nothing that maps to a key, return an empty list. Do not guess.

CANNOT — pick every key for something he asked about that is NOT in the WANTS list above:
${BLIND_SPOT_KEYS.map((k) => `  ${k} — ${BLIND_SPOTS[k as BlindSpot]}`).join('\n')}

Rules for CANNOT:
- Only if he actually raised it. An empty list is the common case.
- Never list something that a WANTS key already covers.

READBACK — one short sentence, under 20 words, in the second person, saying back what he's after in his own terms. No numbers, no unit names, no state names, no advice, no promises. Example: "You want a September bow hunt with few other hunters around."

Reply with JSON only: {"wants": string[], "cannot": string[], "readback": string}`;

type Narrow = { wants: unknown; cannot: unknown; readback: unknown };

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;

  // The model call is the only thing here that costs money, so guard it first.
  const rl = checkRateLimit(getClientIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Give it a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Matching is not set up on this server yet.' }, { status: 503 });
  }

  let body: { state?: string; species?: string; weapon?: string | null; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const text = String(body.text ?? '').trim().slice(0, MAX_TEXT);
  if (text.length < 3) {
    return NextResponse.json({ error: 'Tell us a little about the hunt you want.' }, { status: 400 });
  }

  const ctx = await loadDrawContext(
    auth.viewer.userId,
    body.state || '',
    body.species ?? null,
    asWeapon(body.weapon ?? null),
  );
  if (!ctx) return NextResponse.json({ error: 'We don’t have that state and species.' }, { status: 404 });

  let parsed: Narrow;
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
    });
    parsed = JSON.parse(res.choices[0]?.message?.content || '{}') as Narrow;
  } catch {
    return NextResponse.json({ error: 'Could not read that. Try saying it another way.' }, { status: 502 });
  }

  // Anything the model returns that isn't one of our keys is dropped rather
  // than shown: the vocabulary is closed on purpose.
  const wants = [...new Set((Array.isArray(parsed.wants) ? parsed.wants : []).filter(isWantKey))] as WantKey[];
  const cannot = [...new Set((Array.isArray(parsed.cannot) ? parsed.cannot : []).filter(isBlindSpot))] as BlindSpot[];
  // A readback is a paraphrase of his own words, so there are no facts in it to
  // ground — but it is still model text, so it is length-capped and never
  // allowed to carry a figure.
  const readback = typeof parsed.readback === 'string' && parsed.readback.length <= 160 && !/\d/.test(parsed.readback)
    ? parsed.readback.trim()
    : '';

  // Narrow what the reality step already said was within reach, so the two
  // steps can't contradict each other. Cow and doe tags come into the pool only
  // if he said meat matters.
  const reality = drawReality(ctx.hunts, {
    points: ctx.points,
    state: ctx.stateName,
    species: ctx.species,
    thisYear: currentSeasonYear(),
    cutoffIsADate: cutoffIsADate(ctx.mod.code),
    lottery: !pointsBarMatters(ctx.mod.code),
  });
  const widened = wants.includes('anyAnimal');
  const codes = new Set(
    [...reality.reachable, ...(widened ? reality.antlerless : [])]
      .map((h) => `${h.unit}|${h.huntCode}`),
  );
  const pool = ctx.hunts.filter((e) => codes.has(`${String(e.unit ?? '')}|${e.huntCode == null ? 'null' : String(e.huntCode)}`));

  // The bands for "early", "quiet" and "fills well" are relative to every hunt
  // for this species in the state, not just the reachable ones — otherwise a
  // hunter with few points would be told his only option is the quiet one.
  const cohort = cohortOf(ctx.hunts);
  const { picks, relaxed, excluded } = rankByWants(pool, wants, { species: ctx.species, cohort }, 8);

  return NextResponse.json({
    state: ctx.mod.code,
    species: ctx.species,
    // The compare screen is keyed on the schema's species key, not the label,
    // so the page can hand a pick straight to /compare without a round trip.
    speciesKey: ctx.key,
    points: ctx.points,
    wants,
    cannot: cannot.map((k) => ({ key: k, text: BLIND_SPOTS[k] })),
    readback,
    relaxed,
    excluded,
    seasonYear: currentSeasonYear(),
    considered: pool.length,
    // The reality headline counts antlered hunts only. If "meat matters" pulled
    // cow tags in, the pool is bigger than that sentence said, and the page has
    // to account for the difference rather than print two numbers.
    pool: { antlered: reality.reachable.length, antlerless: widened ? reality.antlerless.length : 0 },
    picks: picks.map((p) => ({
      unit: String(p.entry.unit ?? ''),
      huntCode: p.entry.huntCode == null ? null : String(p.entry.huntCode),
      label: p.entry.label == null ? null : String(p.entry.label),
      season: seasonText(p.entry),
      tags: typeof p.entry.tags === 'number' ? p.entry.tags : null,
      odds: typeof p.entry.drawSuccessAtYourPoints === 'number' ? p.entry.drawSuccessAtYourPoints : null,
      publishedRate: oddsOf(p.entry),
      hunterSuccess: p.entry.hunterSuccess == null ? null : String(p.entry.hunterSuccess),
      pointsNeeded: typeof p.entry.fewestPointsToDraw === 'number' ? p.entry.fewestPointsToDraw : null,
      antlerless: isAntlerless(p.entry as never),
      otc: !!p.entry.otc,
      matched: p.matched,
      missed: p.missed,
      unknown: p.unknown,
    })),
    // Labels live here so the page never has to hard-code our vocabulary.
    wantLabels: Object.fromEntries(WANT_KEYS.map((k) => [k, WANTS[k].label])),
  });
}
