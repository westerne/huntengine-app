import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanSetupAnswers, suggestCalendar } from '@/lib/suggest';
import { calendarYears } from '@/lib/calendar';
import { currentSeasonYear } from '@/lib/hunts';
import { stateCodeOf } from '@/lib/sheetImport';

// POST /api/calendar/suggest — guided-setup answers → a starting calendar to
// review. Saves the answers (and home state / weapon) to the profile; nothing
// goes on the calendar until the hunter accepts suggestions.
export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const answers = cleanSetupAnswers(body, stateCodeOf);
  const supabase = await supabaseServer();
  const profilePatch: Record<string, unknown> = { user_id: auth.viewer.userId, planning: answers };
  // Only a covered state is saved as home; "another state" means non-resident everywhere.
  if (answers.homeState && stateCodeOf(answers.homeState)) profilePatch.home_state = answers.homeState;
  // Answers are kept even if saving them fails; suggestions don't depend on it.
  const { error: saveErr } = await supabase.from('profiles').upsert(profilePatch, { onConflict: 'user_id' });
  if (saveErr) {
    console.error('calendar/suggest: could not save setup answers', saveErr.code, saveErr.message);
    // Still save the home state, which sets residency everywhere.
    const { planning: _drop, ...rest } = profilePatch; // eslint-disable-line @typescript-eslint/no-unused-vars
    if (rest.home_state) await supabase.from('profiles').upsert(rest, { onConflict: 'user_id' });
  }

  const { suggestions, notes } = suggestCalendar(answers, calendarYears(currentSeasonYear()));
  return NextResponse.json({ suggestions, notes, points: answers.points });
}
