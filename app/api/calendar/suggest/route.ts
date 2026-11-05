import { NextResponse } from 'next/server';
import { factsOf } from '@/lib/advisor/facts';
import { requireMember } from '@/lib/apiAuth';
import { supabaseServer } from '@/lib/supabase/server';
import { cleanSetupAnswers, suggestCalendar } from '@/lib/suggest';
import { cleanPoints } from '@/lib/points';
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
  // Point balances live in hunter_points — the table the ledger reads and the
  // one this wizard prefills itself from. They used to be written only into
  // profiles.planning, so a hunter's entries came back blank on their next
  // visit while a stale copy sat in the profile feeding nothing.
  const { points: _points, ...answersOnly } = answers; // eslint-disable-line @typescript-eslint/no-unused-vars
  // Facts the advisor saved live in the same column; redoing setup mustn't erase them.
  const { data: prior } = await supabase.from('profiles').select('planning').eq('user_id', auth.viewer.userId).maybeSingle();
  const facts = factsOf(prior?.planning);
  const planning = facts.length ? { ...answersOnly, facts } : answersOnly;
  const profilePatch: Record<string, unknown> = { user_id: auth.viewer.userId, planning };
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

  // Saved separately so a profile write failing doesn't lose the balances.
  if (answers.points.length) {
    const rows = cleanPoints(answers.points, auth.viewer.userId!);
    if ('error' in rows) {
      console.error('calendar/suggest: rejected point balances', rows.error);
    } else {
      const { error } = await supabase.from('hunter_points').upsert(rows.list, { onConflict: 'user_id,state,species' });
      if (error) console.error('calendar/suggest: could not save points', error.code, error.message);
    }
  }

  const { suggestions, notes, refine } = suggestCalendar(answers, calendarYears(currentSeasonYear()));
  return NextResponse.json({ suggestions, notes, refine, points: answers.points });
}
