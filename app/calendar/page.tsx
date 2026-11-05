import { redirect } from 'next/navigation';

// The hunt calendar is now Plan (one record per hunt, migration 0007).
export default function CalendarPage() {
  redirect('/plan');
}
