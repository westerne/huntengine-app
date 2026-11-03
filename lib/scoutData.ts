// What SCOUT answers when a state/species pair has no hunts in the data.
//
// app/planner/constants.ts has no STATE_SPECIES entry for WY, ID, CO, MT or
// UT, so those five offer all six species. The data doesn't cover every pair:
// Colorado has no bighorn sheep or mountain goat loaded, and Utah has no
// mountain goat. With an empty dataset the model was still prompted and still
// wrote prose, so the hunter got confident text about a species the app has
// nothing on. Say so plainly instead — the same shape as the existing
// non-resident early return, so the planner renders it with no changes.

export type ScoutAnswer = {
  drawReality: {
    regularPoolUnits: number;
    randomPoolUnits: number;
    pointsToNextUnit: number;
    bestLimitedUnit: string;
    summary: string;
  };
  strategyPath: string;
  actionPlan: { headline: string; steps: string[]; randomPoolPlays: string[]; pointBankingAdvice: string };
  drawableUnits: never[];
  recommendations: never[];
  noData: true;
};

// "NEW MEXICO" -> "New Mexico"
export function titleCaseState(stateName: string): string {
  return stateName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function noDataAnswer(stateName: string, speciesLabel: string): ScoutAnswer {
  const state = titleCaseState(stateName);
  const species = speciesLabel.toLowerCase();
  return {
    drawReality: {
      regularPoolUnits: 0,
      randomPoolUnits: 0,
      pointsToNextUnit: 0,
      bestLimitedUnit: '',
      summary: `We don't have ${species} hunts loaded for ${state} yet, so there's nothing here to recommend. We'd rather tell you that than guess. Try another species in ${state}, or ${species} in another state.`,
    },
    strategyPath: 'LONG_GAME',
    actionPlan: { headline: `No ${species} data for ${state} yet`, steps: [], randomPoolPlays: [], pointBankingAdvice: '' },
    drawableUnits: [],
    recommendations: [],
    noData: true,
  };
}
