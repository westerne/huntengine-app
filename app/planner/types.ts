// Planner state shape and defaults.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type FlowStep =
  | 'entry'
  | 'scout-1' | 'scout-2' | 'scout-3' | 'scout-4'
  | 'plan-1' | 'plan-2' | 'plan-3' | 'plan-4'
  | 'recommendations'
  | 'unit-brief' | 'hunt-plan' | 'gear-list';

export type DrawTimeline = 'This Year' | '1-3 Years' | '5 Years' | '10+ Years';

export type Profile = {
  states: string[];
  species: string;
  residency: string;
  points: Record<string, number>;
  weapons: string[];
  huntStyles: string[];
  fitness: string;
  trophyQuality: string;
  seasons: string[];
  drawTimeline: DrawTimeline;
  unit: string;
  daysToHunt: string;
  scoutingAvailability: string;
  notes: string;
  sacrificeTrophy: string;
  knownAreas: string;
  pastExperience: string;
  hunterContext: string;
  includeSpecialDraw: boolean;   // WY only — special draw costs more but better odds
  grizzlyComfort: boolean;       // WY/MT/ID only — willing to hunt grizzly country
};

export type HuntPlannerState = {
  step: FlowStep;
  entryMode: 'has-tag' | 'needs-tag' | null;
  profile: Profile;
  drawReality: any | null;
  strategyPath: string | null;
  actionPlan: any | null;
  recommendations: any[];
  drawableUnits: any[];
  showDrawablePanel: boolean;
  unitBrief: string | null;
  huntPlan: any | null;
  gearList: any | null;
  planUnit: string;       // unit the active plan was built for (drives the map)
  planState: string;
  planSpecies: string;    // WY hunt-area boundaries differ by species
  planRec: any | null;    // the recommendation card the brief was opened from (for saving)
  loading: boolean;
  loadingMessage: string;
  error: string | null;
};

export const INITIAL_PROFILE: Profile = {
  states: ['WY'],
  species: 'Deer',
  residency: 'Resident',
  points: {},
  weapons: ['Any'],
  huntStyles: ['Backcountry'],
  fitness: 'High',
  trophyQuality: '170',
  seasons: ['Mid'],
  drawTimeline: 'This Year',
  unit: '',
  daysToHunt: '5',
  scoutingAvailability: 'Minimal',
  notes: '',
  sacrificeTrophy: 'middle',
  knownAreas: '',
  pastExperience: 'First time hunting this species',
  hunterContext: '',
  includeSpecialDraw: true,
  grizzlyComfort: true,
};

export const INITIAL_STATE: HuntPlannerState = {
  step: 'entry',
  entryMode: null,
  profile: INITIAL_PROFILE,
  drawReality: null,
  strategyPath: null,
  actionPlan: null,
  recommendations: [],
  drawableUnits: [],
  showDrawablePanel: false,
  unitBrief: null,
  huntPlan: null,
  gearList: null,
  planUnit: '',
  planState: 'WY',
  planSpecies: 'Deer',
  planRec: null,
  loading: false,
  loadingMessage: '',
  error: null,
};

// What every form step needs from the page.
export type StepProps = {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  goTo: (step: FlowStep) => void;
  togglePreference: (field: 'weapons' | 'huntStyles' | 'seasons', value: string) => void;
  progress: { steps: FlowStep[]; current: FlowStep };
  flags: PlannerFlags;
};

export type PlannerFlags = {
  selState: string;
  noPointSystem: boolean;
  showGrizzlyOption: boolean;
  showSpecialDrawOption: boolean;
};
