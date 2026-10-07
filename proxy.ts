import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsEnabled } from '@/lib/supabase/config';

// Keeps the Supabase session cookie fresh on every page request (Next 16
// "proxy", formerly middleware). Does nothing in beta-code mode.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!accountsEnabled()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: Array<{ name: string; value: string; options: CookieOptions }>) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static files, images and the Stripe webhook (raw body, no session).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:png|jpg|svg|ico|kmz)$).*)'],
};
