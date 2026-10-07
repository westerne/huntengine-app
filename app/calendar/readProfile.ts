import type { supabaseServer } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof supabaseServer>>;

// Home state + setup answers. If the planning column isn't there yet (a
// migration behind), still return the home state, which sets residency.
export async function readProfile(supabase: Client, userId: string) {
  const full = await supabase.from('profiles').select('home_state, planning').eq('user_id', userId).maybeSingle();
  if (!full.error) return full;
  const basic = await supabase.from('profiles').select('home_state').eq('user_id', userId).maybeSingle();
  return { ...basic, data: basic.data ? { ...basic.data, planning: null } : null };
}
