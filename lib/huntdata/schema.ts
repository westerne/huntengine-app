// Shared hunt-data format for every state HuntQuarters covers.
//
// Each state's agency publishes draw results in its own shape (WGFD demand
// reports, CPW recaps, IDFG hunt planner, MT FWP permit stats, …). A state
// module's job is to turn that into the types below, so SCOUT, BRIEF, tests
// and later multi-state planning can treat every state the same way.

export type StateCode =
  | 'WY' | 'ID' | 'CO' | 'MT' | 'UT' | 'NV' | 'AZ' | 'NM' | 'OR' | 'WA' | 'CA'
  | 'SD' | 'NE' | 'KS' | 'ND' | 'OK'
  | 'AK';

export type SpeciesKey = 'DEER' | 'ELK' | 'ANTELOPE' | 'MOOSE' | 'BIGHORNSHEEP' | 'MTNGOAT';

export type Residency = 'resident' | 'nonresident';

export type Weapon = 'any' | 'rifle' | 'archery' | 'muzzleloader';

// How the state ranks applicants. Drives the draw-system wording in prompts.
export type DrawSystem =
  | 'preference'     // highest points draw first (CO, NV-style pref pools)
  | 'bonus'          // points add extra entries, still random (UT, AZ, NV)
  | 'bonus-squared'  // bonus points squared (MT)
  | 'random'         // pure lottery, no points (ID, NM)
  | 'hybrid';        // split pools — some tags by points, some random (WY NR)

// Draw outcome for one residency pool of one hunt.
export type DrawStat = {
  tags: number | null;          // licenses allotted to this pool
  applicants: number | null;    // first-choice applicants
  successPct: number | null;    // first-choice draw success / odds, 0–100
  minPoints?: number | null;    // fewest points that drew (point-ranked pools only)
  // Sub-pools when a residency's tags are split (e.g. WY NR regular / special /
  // random / special-random). The parent stat holds what's true across them.
  pools?: Array<{ name: string } & DrawStat>;
};

// One row of a points-to-draw table: at this point level, how many applied and drew.
export type PointLine = {
  points: number;
  applicants: number;
  drawn: number;
};

export type Harvest = {
  successPct: number;           // hunter success, 0–100
  year: number;
  hunters?: number | null;
  harvest?: number | null;
  // "hunt" = reported for this exact hunt code; "unit" = reported for the unit
  // and weapon (e.g. CO GMU by season), not this specific license.
  scope: 'hunt' | 'unit';
};

// One huntable product: a hunt code / permit / license type in a unit.
export type Hunt = {
  state: StateCode;
  species: SpeciesKey;
  huntCode: string;             // the agency's own code (e.g. "EE001E1R", "1001", "141-1")
  unit: string;                 // unit / GMU / hunt area / district the hunt belongs to
  label?: string;               // human description, e.g. "Any Elk — Rifle"
  weapon?: Weapon;
  drawYear: number | null;      // year of the draw these stats describe (null if unknown)
  // "official" = parsed from agency results; "estimated" = hand-entered or
  // approximate, and must be presented as such.
  dataQuality: 'official' | 'estimated';
  otc?: boolean;                // general / over-the-counter, no draw
  tags?: number | null;         // total licenses, when not split by residency
  applicants?: number | null;   // total first-choice applicants, when not split
  draw: {
    resident: DrawStat | null;
    nonresident: DrawStat | null;
  };
  pointLines?: Partial<Record<Residency, PointLine[]>>;
  harvest?: Harvest | null;
};

export type Agency = {
  name: string;
  url: string;
};

// Static facts about a state, whether or not its data is wired in yet.
export type StateInfo = {
  code: StateCode;
  name: string;                 // upper-case, matches route.ts stateName ("NEW MEXICO")
  agency: Agency;
  drawSystem: DrawSystem;
  // Plain-English rules the prompts should follow for this state's draw.
  drawSystemNote: string;
  // False until someone checks drawSystem/drawSystemNote against the agency's
  // current regulations. Unverified notes must not be fed to prompts.
  rulesVerified: boolean;
  status: 'live' | 'planned';
  // Species non-residents can't apply for in this state's draw (verified in
  // the state's research notes). SCOUT says so plainly instead of advising.
  residentOnly?: Partial<Record<SpeciesKey, string>>;
  // Rollout batch from ROADMAP.md: live states are "live", the rest A–D.
  batch: 'live' | 'A' | 'B' | 'C' | 'D';
};

// A wired-in state: its facts plus a way to read its hunts.
export type StateModule = StateInfo & {
  species: SpeciesKey[];
  hunts(species: SpeciesKey): Hunt[];
};
