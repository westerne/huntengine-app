// Accounts are on when Supabase is configured. Until then the app runs in
// beta-code mode, so deploys without the new env vars keep working.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const accountsEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
