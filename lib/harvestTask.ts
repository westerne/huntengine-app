/* eslint-disable @typescript-eslint/no-explicit-any */
import { harvestReportingFor, harvestTaskTitle } from './huntdata/harvestReporting';

// Adds the "official harvest report" reminder for a completed hunt, once.
// It's a separate task the hunter ticks themselves — finishing the app's own
// report never ticks it.
export async function ensureHarvestTask(
  supabase: any,
  hunt: { id: string; state: string; species: string; season_year: number; hunt_end?: string | null },
  userId: string,
  report: { ended_on?: string | null } | null,
) {
  const title = harvestTaskTitle(hunt.state, hunt.species, harvestReportingFor(hunt.state, hunt.species));
  if (!title) return;
  const { count } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('hunt_id', hunt.id).eq('kind', 'harvest_report');
  if (count) return;
  // Deadlines vary by rule and outcome, so the task is due the day the hunt
  // ended — "do it now" — rather than a date we'd have to guess.
  const due = report?.ended_on ?? hunt.hunt_end ?? null;
  await supabase.from('tasks').insert({
    user_id: userId, hunt_id: hunt.id, kind: 'harvest_report', title, due_on: due,
    state: hunt.state, species: hunt.species, season_year: hunt.season_year,
  });
}
