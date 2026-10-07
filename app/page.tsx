import { redirect } from 'next/navigation';
import Planner from './planner/page';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';

// Per-request: depends on the signed-in user.
export const dynamic = 'force-dynamic';

// Home. Returning members land on My Season; everyone else gets the planner
// (which shows the sign-in / membership gate, or the beta gate before launch).
export default async function Home() {
  if (accountsEnabled()) {
    const viewer = await getViewer();
    if (viewer.member) redirect('/season');
  }
  return <Planner />;
}
