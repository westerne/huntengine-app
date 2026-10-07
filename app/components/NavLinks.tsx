'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from './SignOutButton';

// Client half of the header: highlights the current section from the URL.
export default function NavLinks({ member, signedIn }: { member: boolean; signedIn: boolean }) {
  const path = usePathname() || '/';
  const section = path.startsWith('/season') ? 'season'
    : path.startsWith('/profile') ? 'profile'
    : path === '/' || path.startsWith('/planner') ? 'find'
    : null;

  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      aria-current={section === key ? 'page' : undefined}
      className={`px-2 sm:px-3 py-2 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${section === key ? 'text-amber-400 bg-zinc-900' : 'text-zinc-400 hover:text-white'}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-1 sm:gap-2" aria-label="Main">
      <Link href={member ? '/season' : '/'} className="text-amber-500 font-black uppercase tracking-[0.2em] text-xs sm:text-sm mr-2 sm:mr-4 whitespace-nowrap">HuntQuarters</Link>
      {member && (
        <>
          {link('/season', 'My Season', 'season')}
          {link('/planner', 'Find a Hunt', 'find')}
          {link('/profile', 'My Profile', 'profile')}
        </>
      )}
      <div className="ml-auto flex items-center">
        {signedIn ? (
          <SignOutButton />
        ) : (
          <Link href="/login" className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:text-white">Sign in</Link>
        )}
      </div>
    </nav>
  );
}
