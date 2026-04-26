// drawLogic/utah.ts
// Utah-specific draw logic.
//
// Utah Draw System Overview:
// - Bonus points: accumulated per unsuccessful application
// - Weighted draw: each point = 1 additional entry (linear, not squared like Idaho)
// - Limited entry (LE): high demand units, often 5-20+ points to draw
// - General season (GS): much easier to draw, lower trophy quality
// - Bonus point buy-in: hunters can purchase a bonus point without applying for a unit
// - NR quota: 10% of LE tags per unit (very limited)
// - Conservation license required before applying
// - Dedicated hunter program: separate pathway for additional tags

import {
  ScoutPromptParams,
  sharedHunterProfile,
  sharedScoringBlock,
  sharedWhyItFitsRules,
  sharedOutputSchema,
} from '../promptBuilder';

export function buildUtahPrompt(params: ScoutPromptParams): string {
  const { hunterPoints, isResident, trophyFloor, weaponLabel, knownAreas, scoutDataset } = params;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A UTAH ${isResident ? 'RESIDENT' : 'NON-RESIDENT'} HUNT ANALYSIS. UTAH DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UTAH DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Utah uses a LINEAR BONUS POINT system:
- Each unsuccessful application = 1 bonus point
- Draw entries = bonus points + 1 (linear — not squared like Idaho)
- Hunter has ${hunterPoints} points = ${hunterPoints + 1} draw entries
- ${isResident ? 'Resident quota: typically 90% of limited entry tags' : 'NR quota: strictly 10% of limited entry tags — very few tags available for NR hunters'}

TAG TYPES:
- Limited Entry (LE): High demand, points required. Trophy quality high. NR quota very small.
- General Season (GS): Much easier to draw. Lower trophy quality. NR can draw with few/no points.
- Spike/Any Buck: Management tags with different rules per unit.

IMPORTANT FOR NR HUNTERS:
- NR hunters are severely limited in Utah — 10% of LE tags means very few tags available
- Some premium units may have 0-1 NR tags per year
- Utah is often a BUILD_AND_WAIT or LONG_GAME state for NR hunters on premium units
- General season units are the primary realistic opportunity for NR hunters with few points

ODDS RULES:
- currentOdds = approximate draw probability based on points and historical NR applicant data
- For general season: currentOdds = much higher (state the approximate odds from data)
- oddsDirection based on trend data only

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset already filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(params)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DRAW REALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Assess:
- For NR: how realistic is any LE unit with ${hunterPoints} points given the tiny NR quota?
- Are general season units a viable fallback option this year?
- How many years to accumulate points for target premium units?

Assign strategyPath:
- "DRAW_NOW" if hunter can realistically draw a quality unit this year
- "RANDOM_PLAY" if GS units provide real hunting opportunity even without LE draw success
- "BUILD_AND_WAIT" if 2-5 years from target unit
- "LONG_GAME" if 6+ years or NR odds are essentially zero

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SCORE UNITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DRAWABILITY (weight most heavily):
- General season drawable this year = 8-9
- LE competitive with current points = 7-9
- LE marginal but realistic in 1-3 years = 4-6
- LE long-term dream unit (5+ years) = 1-3

${sharedScoringBlock(params)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Be honest about NR limitations in Utah — this is a tough state for NR LE tags
- Always include general season options as realistic near-term opportunity
- Explain the bonus point banking strategy clearly
- randomPoolPlays = general season units and any LE units with realistic NR odds
- pointBankingAdvice = specific guidance on Utah point strategy

RECOMMENDATION REQUIREMENTS (minimum 6):
- MUST include at least 1-2 general season options as near-term opportunity
- MUST include 2 premium LE units as BUILD_AND_WAIT or LONG_GAME targets
- All units topEnd >= ${trophyFloor}" or flag the gap
- Be explicit about NR quota reality for each LE unit

${sharedWhyItFitsRules(params)}

${sharedOutputSchema(isResident)}
`;
}