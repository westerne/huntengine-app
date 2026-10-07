import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { siteUrl, stripe, stripeConfigured } from '@/lib/stripe';

// POST /api/stripe/portal → Stripe billing portal (update card, cancel, receipts).
export async function POST(req: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  if (!stripeConfigured()) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 503 });
  const supabase = await supabaseServer();
  const { data } = await supabase.from('memberships').select('stripe_customer_id').eq('user_id', auth.viewer.userId!).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ error: 'No billing account yet.' }, { status: 404 });
  const session = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${siteUrl(req)}/season`,
  });
  return NextResponse.json({ url: session.url });
}
