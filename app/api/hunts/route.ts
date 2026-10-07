import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear, STATUSES, type HuntStatus } from '@/lib/hunts';

// GET  /api/hunts            → the member's saved hunts (newest first)
// POST /api/hunts            → save a hunt to My Season (de-duplicated)

export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('saved_hunts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load your hunts.' }, { status: 500 });
  return NextResponse.json({ hunts: data });
}

const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const state = str(body.state, 4)?.toUpperCase();
  const species = str(body.species, 40);
  const unit = str(body.unit, 80);
  if (!state || !species || !unit) return NextResponse.json({ error: 'State, species and unit are required.' }, { status: 400 });

  const status: HuntStatus = STATUSES.includes(body.status) ? body.status : 'considering';
  const row = {
    user_id: auth.viewer.userId,
    season_year: Number.isInteger(body.seasonYear) ? body.seasonYear : currentSeasonYear(),
    state,
    species,
    unit,
    hunt_code: str(body.huntCode, 60),
    label: str(body.label, 200),
    status,
    application_result: status === 'tag_secured' ? 'successful' : null,
    source: ['scout', 'has_tag', 'manual'].includes(body.source) ? body.source : 'scout',
    search_inputs: body.searchInputs && typeof body.searchInputs === 'object' ? body.searchInputs : null,
    recommendation: body.recommendation && typeof body.recommendation === 'object' ? body.recommendation : null,
  };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('saved_hunts').insert(row).select('*').single();
  if (error) {
    // Unique violation → already saved: hand back the existing record.
    if (error.code === '23505') {
      let q = supabase.from('saved_hunts').select('*')
        .eq('season_year', row.season_year).eq('state', state).eq('species', species);
      q = row.hunt_code ? q.eq('hunt_code', row.hunt_code) : q.is('hunt_code', null).eq('unit', unit);
      const { data: existing } = await q.maybeSingle();
      return NextResponse.json({ hunt: existing, alreadySaved: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'Could not save this hunt.' }, { status: 500 });
  }
  return NextResponse.json({ hunt: data, alreadySaved: false }, { status: 201 });
}
