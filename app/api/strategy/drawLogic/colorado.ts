// drawLogic/colorado.ts
// Colorado-specific draw logic for NR and Resident hunters.
//
// Colorado Draw System Overview:
// - Preference points: 1 point per unsuccessful application
// - Weighted draw: preference point holders drawn before random applicants
// - First come, first served (FCFS) leftover licenses: available after draw
// - OTC licenses: available for many units (rifle 2nd/3rd seasons, archery)
// - License vs tag: hunters buy a license first (species/weapon), then apply for a unit tag
// - NR quota: varies by unit and season — some units 20% NR, others less
// - Limited licenses: controlled units with quota — points help significantly
// - Private land only tags (PLO): separate system
// - DAU (Data Analysis Units): Colorado uses these for population management

import {
  ScoutPromptParams,
  sharedHunterProfile,
  sharedScoringBlock,
  sharedWhyItFitsRules,
  sharedOutputSchema,
} from '../promptBuilder';

export function buildColoradoNRPrompt(params: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, seasonLabel, knownAreas, scoutDataset } = params;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A COLORADO NON-RESIDENT HUNT ANALYSIS. COLORADO DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLORADO NR DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Colorado uses a PREFERENCE POINT system with two-phase draw:
Phase 1: All preference point holders drawn first (by point level, highest first)
Phase 2: Remaining tags go to random applicants (0-point hunters)

This hunter has ${hunterPoints} preference points.

KEY COLORADO DISTINCTIONS:
- OTC (Over The Counter): Many units have unlimited licenses — no draw required
  Common OTC seasons: archery statewide, rifle 2nd season many units, rifle 3rd season many units
- Limited licenses: Controlled quota units — preference points matter significantly
- FCFS (First Come First Served): Leftover licenses after draw, available online
- NR quota: Typically set per unit — NR hunters compete in same draw as residents for their allocated quota
- Points carry across species (elk points work for elk only, deer points for deer only)

OTC OPTIONS FOR NR HUNTERS:
- Colorado archery elk is widely OTC — major opportunity for bow hunters
- Rifle 2nd and 3rd seasons in many GMUs are OTC for NR
- Quality varies significantly by GMU even within OTC units

ODDS RULES:
- OTC units: currentOdds = "OTC — no draw required"
- Limited license units: currentOdds = approximate draw probability based on points and historical data
- FCFS: currentOdds = "FCFS — available after draw if tags remain"
- oddsDirection based on trend data only

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset already filtered.
${weaponLabel.includes('ARCHERY') ? 'NOTE: Colorado archery elk is widely OTC — always highlight OTC archery options.' : ''}

FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(params)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DRAW REALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Assess:
- Are OTC units available for this hunter's weapon/season? (Major opportunity)
- How many limited license units is this hunter competitive for with ${hunterPoints} points?
- FCFS options as additional fallback?

Assign strategyPath:
- "DRAW_NOW" if OTC options exist OR hunter is competitive for limited licenses
- "RANDOM_PLAY" if OTC/FCFS provides real hunting but limited licenses are a stretch
- "BUILD_AND_WAIT" if target premium units require 2-4 more years of points
- "LONG_GAME" if dream units require 5+ years

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SCORE UNITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DRAWABILITY (weight most heavily):
- OTC / no draw required = 10
- FCFS leftover available = 8
- Limited license competitive with current points = 7-9
- Limited license marginal but realistic in 1-2 years = 4-6
- Long-term premium unit (3+ years) = 1-3

${sharedScoringBlock(params)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Lead with OTC options if available — Colorado is one of the best states for OTC elk
- Be specific about GMU numbers and OTC season availability
- Explain preference point strategy — when to burn vs when to bank
- randomPoolPlays = OTC units + FCFS options
- pointBankingAdvice = specific guidance for Colorado point strategy

RECOMMENDATION REQUIREMENTS (minimum 6, ideally 7-8):
- MUST include OTC options if weapon type has OTC availability
- MUST include 2 premium limited license units as BUILD_AND_WAIT or LONG_GAME
- All units topEnd >= ${trophyFloor}" or flag the gap
- Be clear about OTC vs limited license distinction for each unit

${sharedWhyItFitsRules(params)}

${sharedOutputSchema(false)}
`;
}

export function buildColoradoResidentPrompt(params: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, knownAreas, scoutDataset } = params;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A COLORADO RESIDENT HUNT ANALYSIS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLORADO RESIDENT DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Same preference point system as NR. Hunter has ${hunterPoints} points.

Residents have same access to OTC licenses as NR hunters.
For limited licenses, residents and NR hunters compete in the same draw for their respective quotas.
Resident quota allocation is typically larger than NR.

OTC OPTIONS:
- Archery elk: widely OTC statewide
- Rifle 2nd/3rd seasons: many GMUs OTC for residents
- These provide guaranteed hunting opportunity regardless of draw outcome

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset already filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(params)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Emphasize OTC options as guaranteed fallback.
Limited license units ranked by draw competitiveness with ${hunterPoints} points.
Minimum 6 recommendations, ideally 7-8.

RECOMMENDATION REQUIREMENTS:
- MUST include OTC options where available
- All units topEnd >= ${trophyFloor}" or flag the gap
- currentOdds: "OTC" for no-draw units, approximate % for limited licenses

${sharedWhyItFitsRules(params)}

${sharedOutputSchema(true)}
`;
}