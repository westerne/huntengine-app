import { NextResponse } from 'next/server';
import { pointOwnership } from '@/lib/ownership';

// Surface-ownership identify proxy. Given a lat/lng, returns who manages that
// exact spot (BLM SMA) as a normalized, hunter-friendly answer. Proxied
// server-side so we dodge browser CORS and keep the upstream in one place
// (lib/ownership, shared with the public-land sampler).

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng query params required' }, { status: 400 });
  }

  try {
    const o = await pointOwnership(lat, lng);
    return NextResponse.json(o);
  } catch {
    return NextResponse.json(
      { agencyCode: null, agency: 'Lookup unavailable', unitName: null, isPublic: null },
      { status: 200 }
    );
  }
}
