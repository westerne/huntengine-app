import { NextResponse } from 'next/server';
import { normalizeSpecies } from '@/lib/species';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';

// PUT /api/profile → save permanent hunter preferences and point balances.
// Points are what the hunter tells us; verified_on is the date they checked.

const s = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) || null : null);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 40)) : []);

export async function PUT(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const userId = auth.viewer.userId!;
  const supabase = await supabaseServer();

  const p = body.profile ?? {};
  const { error: pErr } = await supabase.from('profiles').upsert({
    user_id: userId,
    display_name: s(p.display_name, 80),
    home_state: s(p.home_state, 4)?.toUpperCase() ?? null,
    species_interests: arr(p.species_interests).map((x) => normalizeSpecies(x)),
    weapons: arr(p.weapons),
    hunt_styles: arr(p.hunt_styles),
    fitness: s(p.fitness, 40),
    experience: s(p.experience, 80),
    grizzly_ok: typeof p.grizzly_ok === 'boolean' ? p.grizzly_ok : null,
    access_notes: s(p.access_notes, 1000),
    typical_budget: s(p.typical_budget, 80),
  }, { onConflict: 'user_id' });
  if (pErr) return NextResponse.json({ error: 'Could not save your profile.' }, { status: 500 });

  if (Array.isArray(body.points)) {
    const rows = body.points
      .filter((r: Record<string, unknown>) => s(r.state, 4) && s(r.species, 40) && Number.isFinite(Number(r.points)) && Number(r.points) >= 0)
      .slice(0, 100)
      .map((r: Record<string, unknown>) => ({
        user_id: userId,
        state: String(r.state).toUpperCase(),
        species: normalizeSpecies(String(r.species)),
        points: Number(r.points),
        as_of_year: Number.isInteger(r.as_of_year) ? r.as_of_year : new Date().getFullYear(),
        verified_on: typeof r.verified_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.verified_on) ? r.verified_on : null,
      }));
    // Replace the member's balances with what the form sent.
    const { error: dErr } = await supabase.from('hunter_points').delete().eq('user_id', userId);
    if (dErr) return NextResponse.json({ error: 'Could not save your points.' }, { status: 500 });
    if (rows.length) {
      const { error: iErr } = await supabase.from('hunter_points').insert(rows);
      if (iErr) return NextResponse.json({ error: 'Could not save your points.' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
