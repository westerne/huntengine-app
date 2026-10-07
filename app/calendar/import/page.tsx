import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import ImportSheet from './ImportSheet';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <ImportSheet />
    </div>
  );
}
