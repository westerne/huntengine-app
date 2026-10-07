import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { getStateModule } from '@/lib/huntdata/registry';
import { speciesKeyOf } from '@/lib/species';

// GET /api/huntdata/options?state=CO&species=Elk — the hunts in our data for a
// state and species, for picking one to compare or plan.
export async function GET(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const state = (searchParams.get('state') || '').toUpperCase();
  const mod = getStateModule(state);
  const key = speciesKeyOf(searchParams.get('species'), state);
  if (!mod || !key) return NextResponse.json({ hunts: [] });
  const hunts = mod.hunts(key).slice(0, 1500).map((h) => ({
    code: h.huntCode, unit: h.unit, label: h.label ?? null, otc: !!h.otc, speciesKey: key,
  }));
  return NextResponse.json({ hunts });
}
