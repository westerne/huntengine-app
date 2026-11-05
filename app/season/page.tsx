import { redirect } from 'next/navigation';

// My Season is now Today (what to do now, with the to-do list) and Plan
// (every hunt by year). Hunt pages stay at /season/[id].
export default async function SeasonPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  redirect(welcome ? '/today?welcome=1' : '/today');
}
