'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => { await supabaseBrowser().auth.signOut(); window.location.href = '/login'; }}
      className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
    >
      Sign out
    </button>
  );
}
