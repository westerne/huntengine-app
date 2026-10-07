import Link from 'next/link';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import SignOutButton from './SignOutButton';

// Top navigation for signed-in pages. Hidden entirely in beta-code mode.
export default async function AppNav({ current }: { current?: 'season' | 'find' | 'profile' }) {
  if (!accountsEnabled()) return null;
  const viewer = await getViewer();
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      aria-current={current === key ? 'page' : undefined}
      className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest ${current === key ? 'text-amber-400 bg-zinc-900' : 'text-zinc-400 hover:text-white'}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-zinc-900 bg-black/80 backdrop-blur sticky top-0 z-40">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2" aria-label="Main">
        <Link href={viewer.member ? '/season' : '/'} className="text-amber-500 font-black uppercase tracking-[0.2em] text-sm mr-4">HuntQuarters</Link>
        {viewer.member && (
          <>
            {link('/season', 'My Season', 'season')}
            {link('/planner', 'Find a Hunt', 'find')}
            {link('/profile', 'My Profile', 'profile')}
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {viewer.userId ? (
            <SignOutButton />
          ) : (
            <Link href="/login" className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:text-white">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
