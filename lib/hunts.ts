// Saved-hunt lifecycle rules (My Season). Pure functions so they can be
// tested without a database.

export const STATUSES = ['considering', 'planned', 'applied', 'tag_secured', 'preparing', 'completed', 'archived'] as const;
export type HuntStatus = (typeof STATUSES)[number];

export const RESULTS = ['pending', 'successful', 'unsuccessful', 'alternate', 'withdrawn'] as const;
export type ApplicationResult = (typeof RESULTS)[number];

export const STATUS_LABEL: Record<HuntStatus, string> = {
  considering: 'Considering',
  planned: 'Planned',
  applied: 'Applied',
  tag_secured: 'Tag secured',
  preparing: 'Preparing',
  completed: 'Completed',
  archived: 'Archived',
};

export const RESULT_LABEL: Record<ApplicationResult, string> = {
  pending: 'Result pending',
  successful: 'Drew',
  unsuccessful: 'Did not draw',
  alternate: 'Alternate',
  withdrawn: 'Withdrawn',
};

export type SavedHunt = {
  id: string;
  season_year: number;
  state: string;
  species: string;
  unit: string;
  hunt_code: string | null;
  label: string | null;
  status: HuntStatus;
  application_result: ApplicationResult | null;
  source: 'scout' | 'has_tag' | 'manual';
  recommendation: Record<string, unknown> | null;
  search_inputs: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

// Allowed moves. Every status can be archived and un-archived back to
// considering; nothing is ever deleted by a status change.
const NEXT: Record<HuntStatus, HuntStatus[]> = {
  considering: ['planned', 'applied', 'tag_secured', 'archived'],
  planned: ['considering', 'applied', 'archived'],
  applied: ['planned', 'tag_secured', 'archived'],
  tag_secured: ['preparing', 'completed', 'archived'],
  preparing: ['tag_secured', 'completed', 'archived'],
  completed: ['archived'],
  archived: ['considering'],
};

export function canMove(from: HuntStatus, to: HuntStatus): boolean {
  return from === to || NEXT[from].includes(to);
}

// Status + result changes requested together, validated as a unit.
export function applyChange(
  hunt: Pick<SavedHunt, 'status' | 'application_result'>,
  change: { status?: HuntStatus; application_result?: ApplicationResult | null },
): { status: HuntStatus; application_result: ApplicationResult | null } | { error: string } {
  let status = change.status ?? hunt.status;
  let result = change.application_result !== undefined ? change.application_result : hunt.application_result;

  if (!canMove(hunt.status, status)) return { error: `Can't move from ${STATUS_LABEL[hunt.status]} to ${STATUS_LABEL[status]}.` };

  // Back to Considering/Planned (incl. un-archiving) means not applied for any
  // more, so an old draw result no longer applies.
  if ((status === 'considering' || status === 'planned') && change.application_result === undefined) result = null;

  // Marking applied starts a pending result; a draw result only makes sense once applied.
  if (status === 'applied' && hunt.status !== 'applied' && result == null) result = 'pending';
  if (result && result !== 'pending' && !['applied', 'tag_secured', 'preparing', 'completed', 'archived'].includes(status)) {
    return { error: 'Record a draw result after marking the hunt Applied.' };
  }
  // Drawing moves the hunt to Tag secured; an unsuccessful result stays Applied (kept in history).
  if (result === 'successful' && status === 'applied') status = 'tag_secured';
  return { status, application_result: result ?? null };
}

// The one next action shown on a hunt card.
export function nextAction(h: Pick<SavedHunt, 'status' | 'application_result'>): { label: string; to?: HuntStatus } {
  switch (h.status) {
    case 'considering': return { label: 'Decide: plan to apply?', to: 'planned' };
    case 'planned': return { label: 'Apply, then mark it Applied', to: 'applied' };
    case 'applied':
      if (h.application_result === 'unsuccessful') return { label: 'Find another hunt' };
      return { label: 'Record your draw result' };
    case 'tag_secured': return { label: 'Start your hunt plan', to: 'preparing' };
    case 'preparing': return { label: 'Finish your hunt plan' };
    case 'completed': return { label: 'Write your hunt report' };
    case 'archived': return { label: 'Archived' };
  }
}

// Season year a saved hunt belongs to: the upcoming draw. Draws for fall hunts
// happen Jan–Jun, so from July on, new saves are for next year's season.
export function currentSeasonYear(now = new Date()): number {
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}
