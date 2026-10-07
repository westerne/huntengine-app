import { redirect } from 'next/navigation';
import AppNav from '../components/AppNav';
import ProfileForm from './ProfileForm';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

// Per-request: depends on the signed-in user.
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const supabase = await supabaseServer();
  const [{ data: profile }, { data: points }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points, as_of_year, verified_on').order('state'),
  ]);
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <AppNav current="profile" />
      <ProfileForm email={viewer.email} profile={profile ?? {}} points={points ?? []} />
    </div>
  );
}
