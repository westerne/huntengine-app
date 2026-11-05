import Link from 'next/link';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { Lockup } from '../ui';
import { TabBar, ThemeToggle } from '../ui/client';
import SignOutButton from './SignOutButton';

// App shell, rendered once in the root layout: the brand header and, for
// members, the tab bar (bottom on phones, under the header on desktop).
// Hidden entirely in beta-code mode.
export default async function AppNav() {
  if (!accountsEnabled()) return null;
  const viewer = await getViewer();
  return (
    <div className="hq print:hidden">
      <header className="hq-header">
        <Link href={viewer.member ? '/plan' : '/'} aria-label="Home" style={{ textDecoration: 'none' }}><Lockup size={24} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          {viewer.userId ? <SignOutButton /> : <Link href="/login" className="hq-btn hq-btn--secondary hq-btn--sm">Sign in</Link>}
        </div>
      </header>
      {viewer.member && <TabBar />}
    </div>
  );
}
