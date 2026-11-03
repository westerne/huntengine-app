import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { asWeapon, loadDrawContext } from '@/lib/huntdata/drawContext';
import { drawReality } from '@/lib/huntdata/reality';
import { cutoffIsADate } from '@/lib/huntdata/drawSystem';
import { currentSeasonYear } from '@/lib/hunts';

// GET /api/huntdata/reality?state=NV&species=Elk[&weapon=rifle]
//
// What this hunter's points actually buy, worked out from the draw data. No
// model call, so it costs nothing and can't invent — which is why the new
// Find a Hunt flow can show it before asking any questions.
export async function GET(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const ctx = await loadDrawContext(
    auth.viewer.userId,
    searchParams.get('state') || '',
    searchParams.get('species'),
    asWeapon(searchParams.get('weapon')),
  );
  if (!ctx) return NextResponse.json({ error: 'We don’t have that state and species.' }, { status: 404 });

  const reality = drawReality(ctx.hunts, {
    points: ctx.points,
    state: ctx.stateName,
    species: ctx.species,
    thisYear: currentSeasonYear(),
    cutoffIsADate: cutoffIsADate(ctx.mod.code),
  });

  return NextResponse.json({
    ...reality,
    state: ctx.mod.code,
    species: ctx.species,
    // The compare screen keys on the schema's species key, not the label.
    speciesKey: ctx.key,
    residency: ctx.residency,
    weapon: ctx.weapon,
    seasonYear: currentSeasonYear(),
  });
}
