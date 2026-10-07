# Turning on accounts and memberships

The code for accounts, the annual membership, My Season and My Profile is in place, but it stays **off** until the settings below exist. Until then the site runs in beta-code mode exactly as before.

Do everything in **Stripe test mode** first. Once a full test signup works, repeat the Stripe steps in live mode.

## 1. Supabase (accounts + database)

1. Create a new Supabase project called **HuntQuarters**. Keep it separate from GeoMutt.
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order (`0001_…` through `0006_…`). Each one is safe to re-run.
3. Under **Authentication → URL Configuration**:
   - Site URL: `https://huntengine-app.vercel.app` (or the final domain).
   - Redirect URLs: add `https://huntengine-app.vercel.app/auth/callback` and `http://localhost:3400/auth/callback`.
4. Under **Authentication → Providers → Email**, keep "Confirm email" on.
5. From **Project Settings → API**, copy:
   - the Project URL
   - the `anon` public key
   - the `service_role` key, which is secret and goes on the server only

## 2. Stripe (annual membership)

1. **Products**: create "HuntQuarters Membership" with one **yearly** recurring price. Copy the price ID (`price_…`).
2. **Developers → Webhooks**: add the endpoint `https://huntengine-app.vercel.app/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Then copy the signing secret (`whsec_…`).
3. **Settings → Billing → Customer portal**: turn it on. Members use it to update their card or cancel.
4. **Beta testers' free year**:
   1. Under **Products → Coupons**, create a 100%-off coupon with duration **Once**. On an annual price, that covers the first year.
   2. Add a **promotion code** for it, such as `HQBETA2027`, and set max redemptions to the number of testers.
   3. Testers enter that code at checkout.

## 3. Environment variables

Add these in **Vercel → huntengine-app → Settings → Environment Variables** (Production, and Preview if you use preview deploys). Add the same ones to `.env.local` for local testing.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` key (secret) |
| `STRIPE_SECRET_KEY` | `sk_test_…`, later `sk_live_…` |
| `STRIPE_PRICE_ID` | the yearly `price_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `NEXT_PUBLIC_SITE_URL` | `https://huntengine-app.vercel.app` |

Keep `BETA_ACCESS_CODE` set while testers move over. The analysis API accepts either a valid beta code or an active member. Remove the code at launch.

## 4. Deploy

Run this from the repo:

```bash
npx vercel --prod --yes
```

Vercel isn't connected to GitHub, so pushing does not deploy.

## What happens once it's on

- **Signed out:** visitors see Sign in / Create account instead of the beta-code box.
- **New accounts:** confirm their email, then go to **/join**, where Stripe Checkout sells the annual membership.
- **Members:** land on **My Season** and can:
  - save recommendations ("+ Save to My Season")
  - track status and draw results
  - keep notes
  - save a tag they already have
- **Lapsed members** (canceled, or unpaid for more than 3 days past their period end) lose access to new searches. Their saved data stays in the database.
