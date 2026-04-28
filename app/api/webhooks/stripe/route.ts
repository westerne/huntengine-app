import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient as createServerSupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Webhook handler runs in Node.js runtime (not edge) so it can handle raw bodies
export const runtime = 'nodejs'

// We need a Supabase admin client (using the service role key) so the webhook
// can update ANY user's profile, not just the logged-in one. The webhook isn't
// "logged in" as a user — it's a server-to-server call from Stripe.
function getSupabaseAdmin() {
  return createServerSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Map Stripe price lookup keys back to our internal plan names
const LOOKUP_KEY_TO_PLAN: Record<string, string> = {
  vizirack_monthly: 'vizirack',
  vizirack_annual: 'vizirack',
  vizirack_pro_monthly: 'vizirack_pro',
  vizirack_pro_annual: 'vizirack_pro',
  vizirack_outfitter_monthly: 'vizirack_outfitter',
  vizirack_outfitter_annual: 'vizirack_outfitter',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    )
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  // 1. Verify the request actually came from Stripe by checking the signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  console.log(`📨 Stripe webhook received: ${event.type}`)

  const supabase = getSupabaseAdmin()

  try {
    // 2. Handle the event based on its type
    switch (event.type) {
      // Fires when a checkout completes successfully
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.supabase_user_id
        const tier = session.metadata?.tier

        if (!userId) {
          console.error('No supabase_user_id in session metadata')
          break
        }

        // Update the user's profile with the new plan and subscription details
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: tier || 'vizirack',
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('Failed to update profile:', error)
          throw error
        }

        console.log(`✅ User ${userId} upgraded to ${tier}`)
        break
      }

      // Fires when a subscription is created or modified
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        const userId = subscription.metadata?.supabase_user_id
        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        // Look up the price's lookup key to determine the plan
        const priceId = subscription.items.data[0]?.price.id
        const price = await stripe.prices.retrieve(priceId)
        const lookupKey = price.lookup_key
        const plan = lookupKey ? LOOKUP_KEY_TO_PLAN[lookupKey] : 'free'

        const { error } = await supabase
          .from('profiles')
          .update({
            plan: plan,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_period_end: new Date(
              (subscription as any).current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('Failed to update profile:', error)
          throw error
        }

        console.log(`✅ Subscription ${subscription.id} synced — user ${userId} is now ${plan}`)
        break
      }

      // Fires when a subscription is canceled or expires
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (!userId) {
          console.error('No supabase_user_id in subscription metadata')
          break
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('Failed to downgrade profile:', error)
          throw error
        }

        console.log(`⬇️ User ${userId} downgraded to free`)
        break
      }

      // Fires when a recurring payment fails
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionField = (invoice as any).subscription

        if (!subscriptionField) break

        const subscription = await stripe.subscriptions.retrieve(
          typeof subscriptionField === 'string' ? subscriptionField : subscriptionField.id
        )
        const userId = subscription.metadata?.supabase_user_id
        if (!userId) break

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        console.log(`⚠️ Payment failed for user ${userId}`)
        break
      }

      default:
        // Unhandled event type — just log and acknowledge
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Acknowledge receipt to Stripe
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}