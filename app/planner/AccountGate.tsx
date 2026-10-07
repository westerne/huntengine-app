'use client';

import Link from 'next/link';

// Shown instead of the beta gate once accounts are on: every HuntQuarters
// account is a paid membership, so signed-out visitors and non-members are
// sent to sign in or join.
export default function AccountGate({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-amber-500 font-black uppercase tracking-[0.25em] text-3xl mb-1">HuntQuarters</h1>
      <p className="text-zinc-400 text-sm max-w-sm mt-4 mb-10">
        {signedIn
          ? 'Your account doesn’t have an active membership yet.'
          : 'Hunt recommendations, draw odds and your season plan — for members.'}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {signedIn ? (
          <Link href="/join" className="bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Become a member</Link>
        ) : (
          <>
            <Link href="/login" className="bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-xs">Sign in</Link>
            <Link href="/login" className="border-2 border-zinc-700 text-white py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Create an account</Link>
          </>
        )}
      </div>
    </div>
  );
}
