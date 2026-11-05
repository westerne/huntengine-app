'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = '/login'; }}
      className="hq-btn hq-btn--ghost hq-btn--sm"
    >
      Sign out
    </button>
  );
}
