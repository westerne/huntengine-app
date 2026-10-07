import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import NavLinks from './NavLinks';

// Site header, rendered once in the root layout so every page has it.
// Hidden entirely in beta-code mode.
export default async function AppNav() {
  if (!accountsEnabled()) return null;
  const viewer = await getViewer();
  return (
    <header className="border-b border-zinc-900 bg-black/90 backdrop-blur sticky top-0 z-40">
      <NavLinks member={viewer.member} signedIn={!!viewer.userId} />
    </header>
  );
}
