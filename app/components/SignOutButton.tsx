'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton({ className = 'hq-btn hq-btn--ghost hq-btn--sm' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = '/login'; }}
      className={className}
    >
      Sign out
    </button>
  );
}
