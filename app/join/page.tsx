import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import JoinButton from './JoinButton';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { STATE_INFO } from '@/lib/huntdata/registry';
import { AuthCard } from '../ui';

// Per-request: depends on the signed-in user.
export const dynamic = 'force-dynamic';

// Membership checkout. Every HuntQuarters account is a paid annual
// membership; beta testers redeem their free-year code in Stripe Checkout.
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (viewer.member) redirect('/today');
  const { canceled } = await searchParams;
  const states = Object.keys(STATE_INFO).length;

  return (
    <AuthCard title="Plan every draw with HuntQuarters" sub="One yearly membership for the whole draw cycle." width={480}>
      <ul className="hq-stack" style={{ gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
        {[
          `Draw odds at your points for ${states} western states, from each agency's own results`,
          'Your hunts by year, with your points and every deadline in one place',
          'Hunter success and season dates, and herd quality where the state publishes it',
          'An advisor that answers from the data, with sources',
          'Unit briefs and hunt plans for the tags you draw',
        ].map((t) => (
          <li key={t} className="hq-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Check size={18} aria-hidden="true" style={{ color: 'var(--good)', flex: 'none', marginTop: 2 }} />{t}
          </li>
        ))}
      </ul>
      {canceled && <p role="status" className="hq-small">Checkout was canceled. No charge was made.</p>}
      <JoinButton />
      <p className="hq-small" style={{ textAlign: 'center' }}>Billed yearly through Stripe. Have a beta code? Enter it at checkout. Cancel anytime from Me.</p>
    </AuthCard>
  );
}
