import { supabaseServer } from './supabase/server';
import { accountsEnabled } from './supabase/config';

// Stripe subscription statuses that grant access. 'past_due' keeps access
// during Stripe's retry window so a failed card doesn't lock a member out
// mid-season.
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export function isActiveStatus(status: string | null | undefined, periodEnd?: string | null): boolean {
  if (!status || !ACTIVE.has(status)) return false;
  if (periodEnd && new Date(periodEnd).getTime() < Date.now() - 3 * 24 * 3600 * 1000) return false;
  return true;
}

export type Viewer = {
  userId: string | null;
  email: string | null;
  member: boolean;
};

// Who is making this request, and are they a paying member?
export async function getViewer(): Promise<Viewer> {
  if (!accountsEnabled()) return { userId: null, email: null, member: false };
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, email: null, member: false };
  const { data } = await supabase
    .from('memberships')
    .select('status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, email: user.email ?? null, member: isActiveStatus(data?.status, data?.current_period_end) };
}
