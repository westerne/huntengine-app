import { redirect } from 'next/navigation';
import JoinButton from './JoinButton';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';

// Per-request: depends on the signed-in user.
export const dynamic = 'force-dynamic';

// Membership checkout. Every HuntQuarters account is a paid annual
// membership; beta testers redeem their free-year code in Stripe Checkout.
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (viewer.member) redirect('/season');
  const { canceled } = await searchParams;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <main className="max-w-xl mx-auto px-4 py-16">
        <p className="text-[10px] uppercase text-amber-500 font-black tracking-widest mb-2">Membership</p>
        <h1 className="text-3xl font-black italic uppercase mb-4">Plan every draw with HuntQuarters</h1>
        <p className="text-zinc-300 text-sm leading-relaxed mb-8">
          One annual membership covers the whole draw cycle: hunt recommendations built on official draw and harvest data,
          My Season to track what you&apos;re applying for, and unit briefs and hunt plans once you draw.
        </p>
        <ul className="space-y-2 text-sm text-zinc-300 mb-10">
          {[
            'Recommendations for 8 western states, with more added through the season',
            'Draw odds at your point level and agency hunter-success rates',
            'My Season: save hunts, track applications and draw results',
            'Unit briefs, maps and hunt plans for the tags you draw',
          ].map((t) => <li key={t} className="flex gap-3"><span className="text-amber-500" aria-hidden>✓</span>{t}</li>)}
        </ul>
        {canceled && <p role="status" className="text-zinc-400 text-sm mb-4">Checkout was canceled — no charge was made.</p>}
        <JoinButton />
        <p className="text-zinc-600 text-xs mt-4">Billed yearly through Stripe. Have a beta code? Enter it at checkout. Cancel anytime from My Profile.</p>
      </main>
    </div>
  );
}
