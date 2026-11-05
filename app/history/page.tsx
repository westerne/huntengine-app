import { redirect } from 'next/navigation';

// History is now Past seasons on Plan, with your draw and harvest totals.
export default function HistoryPage() {
  redirect('/plan#past');
}
