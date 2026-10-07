import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { siteUrl, stripe, stripeConfigured } from '@/lib/stripe';

// POST /api/stripe/checkout → Stripe Checkout URL for the annual membership.
// Promotion codes are enabled so beta testers can redeem their free-year code.
export async function POST(req: Request) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  if (!stripeConfigured()) return NextResponse.json({ error: 'Payments are not set up yet.' }, { status: 503 });

  const supabase = await supabaseServer();
  const { data: membership } = await supabase
    .from('memberships').select('stripe_customer_id').eq('user_id', auth.viewer.userId!).maybeSingle();

  const base = siteUrl(req);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: auth.viewer.userId!,
    // Reuse the Stripe customer if they've paid before; otherwise prefill email.
    ...(membership?.stripe_customer_id
      ? { customer: membership.stripe_customer_id }
      : { customer_email: auth.viewer.email ?? undefined }),
    subscription_data: { metadata: { user_id: auth.viewer.userId! } },
    metadata: { user_id: auth.viewer.userId! },
    success_url: `${base}/season?welcome=1`,
    cancel_url: `${base}/join?canceled=1`,
  });
  return NextResponse.json({ url: session.url });
}
