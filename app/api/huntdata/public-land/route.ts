import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { getPublicLandPct } from '@/lib/landstats';

// GET /api/huntdata/public-land?state=OR&species=Elk&unit=10 — sampled share
// of public land in the unit (BLM land status). Slow the first time, cached a day.
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || '';
  const species = url.searchParams.get('species') || '';
  const unit = url.searchParams.get('unit') || '';
  if (!state || !unit) return NextResponse.json({ error: 'state and unit required' }, { status: 400 });
  const stats = await getPublicLandPct(url.origin, state, species, unit);
  return NextResponse.json({ publicPct: stats?.publicPct ?? null, sampled: stats?.sampled ?? 0 });
}
