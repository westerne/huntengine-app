import { NextResponse } from 'next/server';
import { getViewer, type Viewer } from './membership';
import { accountsEnabled } from './supabase/config';

// For member-only API routes: returns the viewer, or a JSON error response
// (401 not signed in, 402 no active membership, 503 accounts not configured).
export async function requireMember(): Promise<{ viewer: Viewer } | { error: NextResponse }> {
  if (!accountsEnabled()) {
    return { error: NextResponse.json({ error: 'Accounts are not set up yet.' }, { status: 503 }) };
  }
  const viewer = await getViewer();
  if (!viewer.userId) return { error: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  if (!viewer.member) return { error: NextResponse.json({ error: 'An active HuntQuarters membership is required.' }, { status: 402 }) };
  return { viewer };
}

export async function requireUser(): Promise<{ viewer: Viewer } | { error: NextResponse }> {
  if (!accountsEnabled()) {
    return { error: NextResponse.json({ error: 'Accounts are not set up yet.' }, { status: 503 }) };
  }
  const viewer = await getViewer();
  if (!viewer.userId) return { error: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  return { viewer };
}
