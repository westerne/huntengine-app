// promptBuilder.ts
// Single entry point for all scout prompt generation.
// route.ts calls buildScoutPrompt() only — never builds prompts inline.
// Each state's draw logic lives in this file (Wyoming/Idaho/Utah/Colorado).
// Shared blocks (hunter profile, scoring, output schema) live here too.

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type ScoutPromptParams = {
  stateName: string;
  speciesKey: string;
  isResident: boolean;
  hunterPoints: number;
  trophyFloor: number;
  timeline: string;
  huntStyle: string;
  fitness: string;
  weaponLabel: string;
  allowedHuntTypeCodes: string[];
  seasonLabel: string;
  seasonContext: string;
  sacrificeTrophy: string;
  knownAreas: string;
  pastExperience: string;
  hunterContext: string;
  daysToHunt: string;
  scoutingAvailability: string;
  notes: string;
  includeSpecialDraw: boolean;
  grizzlyComfort: boolean;
  scoutDataset: any[];
  formData: Record<string, any>;
};

// ─── SHARED BLOCKS ────────────────────────────────────────────────────────────

export function sharedHunterProfile(p: ScoutPromptParams): string {
  return `
HUNTER PROFILE:
- State: ${p.stateName}
- Species: ${p.speciesKey}
- Residency: ${p.isResident ? 'Resident' : 'Non-Resident'}
- Points: ${p.hunterPoints}
- Trophy Floor: ${p.trophyFloor}" minimum
- Draw Timeline: ${p.timeline}
- Hunt Style: ${p.huntStyle}
- Fitness Level: ${p.fitness}
- Days Available: ${p.daysToHunt}
- Scouting Availability: ${p.scoutingAvailability}
- Willing to Sacrifice Trophy for Drawability: ${p.sacrificeTrophy || 'Not specified'}
- Units / Areas They Already Know: ${p.knownAreas || 'None provided'}
- Past Experience with This Species: ${p.pastExperience || 'Not specified'}
- Hunter Context (their own words): ${p.hunterContext || 'None provided'}
- Notes: ${p.notes || 'None'}
- Weapon: ${p.weaponLabel}
- Preferred Seasons: ${p.seasonLabel}
- Season Context: ${p.seasonContext}
`.trim();
}

export function sharedScoringBlock(p: ScoutPromptParams): string {
  return `
2. TROPHY MATCH
- topEnd must reach ${p.trophyFloor}". topEnd 20"+ above floor = 9-10. Just meeting floor = 5-6.
- If hunter will sacrifice trophy for drawability, relax and note the tradeoff explicitly.

3. ACCESS & STYLE MATCH
- Hunt style: ${p.huntStyle}, Fitness: ${p.fitness}
- Preferred seasons: ${p.seasonLabel} — ${p.seasonContext}
- ARCHERY + EARLY season: reward September rut units with timber/park edges and thermal terrain. Penalize late-season rifle destinations.
- MID season: reward peak rut access and open country for spotting.
- LATE season: reward lower elevation winter range units.
- Backcountry/bivy/spike: reward remote roadless terrain. Penalize road-accessible units.
- Truck/base camp: reward road access and vehicle-friendly terrain.
- High fitness: reward demanding elevation. Moderate/low: penalize extreme terrain.
- Known areas (${p.knownAreas || 'none'}): bump matching units +1 and reference familiarity by name.
- Season must match unit's available season dates — never recommend a unit with no archery season to an archery hunter.

4. PRESSURE & OPPORTUNITY
- Lower applicant-to-quota ratio = less pressure = higher score.
`.trim();
}

export function sharedWhyItFitsRules(p: ScoutPromptParams): string {
  const isResident = p.isResident;
  const generalRegionKeys = ['G','H','W','B','C','Y','R','X','L','K','D','F','A','J','M','Q','T'];
  const knownRegions = generalRegionKeys.filter(r =>
    new RegExp(`\\b${r}\\b`, 'i').test(p.knownAreas || '')
  );
  const hasKnownOTC = isResident && knownRegions.length > 0;
  const knownLabel = knownRegions.join('/');

  return `
WHYFITS REQUIREMENTS — every entry must include ALL five of these:

1. Draw odds: state this hunter's exact access and odds for this unit.
   ${isResident ? `For resident limited quota units: "Your resident odds here are X% — roughly 1 draw for every Y applications." Frame it as an annual lottery play, not a points build.` : `State which pool is accessible and the exact odds.`}

2. Season match: state ALL relevant season dates for this hunter's weapon selection (${p.weaponLabel}) and preferred seasons (${p.seasonLabel}).
   - If hunter selected Archery: show archery season dates (archery.open to archery.close)
   - If hunter selected Rifle: show rifle season dates (rifle.open to rifle.close)
   - If hunter selected both or "Any": show both archery AND rifle dates
   - The "season" field in JSON must contain all relevant dates as a single readable string, e.g. "Archery: Sep 1-30 | Rifle: Oct 1-31"
   - Never show only archery dates to a rifle hunter or vice versa

3. Terrain: use the actual unit name, drainage, and geographic location from the data. For GENERAL_REGION entries, cite a specific notableUnit inside that region to anchor the geography — e.g. "Region G includes Unit 143 (South Piney, core Wyoming Range) and Unit 145 (Salt River Range on the Idaho border)". For LIMITED_QUOTA entries, the unit IS the geography. 2-4 word terrain descriptor only in the terrain field (e.g. "Alpine canyon drainage" or "High desert mesa country") — NOT the full description string.

4. Known area connection: if the unit matches or borders "${p.knownAreas}", call it out by name.

5. Trophy reality — BE SPECIFIC AND HONEST:
   ${hasKnownOTC
     ? `This hunter already hunts Region ${knownLabel} OTC. DO NOT say "tops out at 200"+ vs your OTC access at 200"+" — that comparison is meaningless when both numbers are the same.
   Instead: Compare the TYPICAL ranges. Region G typical is 165-185", Region H typical is 160-185".
   - Unit 128-1 typical is 170-185" with documented giants well above that — the difference is buck age class and remoteness, not just ceiling.
   - Unit 141-1 typical is 175-190" — a genuine step above what you'll typically encounter in G or H.
   - Unit 102-1 typical is 170-195" but produces a different genetic profile (deep desert bucks with extreme mass) that G/H don't offer.
   Write this as: "Typical bucks here run X-Y" — meaningfully [above/different from] what you see in Region G/H. The upgrade here is [specific reason: age class, genetics, pressure, terrain isolation, etc.]"`
     : `State the actual typical and top-end ranges from the data. Be specific about what a good animal here actually looks like.`
   }

Every sentence must be specific to this unit and this hunter. No copy-paste between units.
`.trim();
}

export function sharedOutputSchema(isResident: boolean): string {
  return `
OUTPUT — return ONLY valid JSON. No markdown, no extra keys, no explanation outside the JSON.

{
  "drawReality": {
    "regularPoolUnits": number,
    "randomPoolUnits": number,
    "pointsToNextUnit": number,
    "bestLimitedUnit": string,
    "summary": string
  },
  "strategyPath": "DRAW_NOW" | "RANDOM_PLAY" | "BUILD_AND_WAIT" | "LONG_GAME",
  "actionPlan": {
    "headline": string,
    "steps": string[],
    "randomPoolPlays": string[],
    "pointBankingAdvice": string
  },
  "drawableUnits": [
    {
      "unit": string,
      "state": string,
      "typicalScore": string,
      "topEnd": string,
      "currentOdds": string,
      "poolType": "Regular" | "Special" | "OTC",
      "season": string,
      "terrain": string,
      "requiresGuide": boolean,
      "grizzlyPresence": boolean,
      "tier": "DRAW_NOW"
    }
  ],
  "recommendations": [
    {
      "unit": string,
      "state": string,
      "typicalScore": string,
      "topEnd": string,
      "drawFeasibility": string,
      "currentOdds": string,
      "predictedOdds": string,
      "oddsDirection": "UP" | "DOWN" | "STABLE",
      ${isResident
        ? '"residentOdds": string, "residentQuota": number, "residentApplicants": number,'
        : '"nrMinPoints": number, "nrRandomOdds": string,'}
      "season": string,
      "terrain": string,
      "accessRating": string,
      "pressureRating": string,
      "totalScore": number,
      "tier": "DRAW_NOW" | "RANDOM_PLAY" | "BUILD_AND_WAIT" | "LONG_GAME",
      "whyItFits": string,
      "tradeoffs": string
    }
  ]
}

UNIT KEY FORMAT RULES (CRITICAL):
- Wyoming deer general regions are single letters: "A", "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "Q", "R", "T", "W", "X", "Y"
- Wyoming deer Limited Quota units use suffix "-1" for Type 1 antlered tags (e.g. "141-1", "128-1", "102-1") and "-2" for Type 2 tags (e.g. "60-2", "64-2", "119-2")
- Wyoming deer Type 3 whitetail tags use suffix "-3" and may span multiple areas (e.g. "11-12-13-14-3")
- The "unit" field in your output MUST match the dataset's "unit" key exactly — never strip the suffix, never output just the area number alone
- For GENERAL_REGION entries: use the letter key ("G", "H", etc.) not a unit number inside that region

drawableUnits RULES:
- Include EVERY unit from the dataset where regular pool OR special pool is accessible for this hunter (or residentOdds >= 15% for residents, or OTC general regions).
- This is a complete list — not curated. Include all of them even if not in recommendations.
- Keep each entry brief — just the fields listed above.
- poolType: "Regular" if regular pool accessible, "Special" if only special pool accessible, "OTC" if general region.
- Sort by currentOdds descending (highest odds first).
- requiresGuide and grizzlyPresence: copy directly from dataset field values.
`.trim();
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

export function buildScoutPrompt(params: ScoutPromptParams): string {
  const { stateName, isResident } = params;

  if (stateName === 'WYOMING') {
    return isResident
      ? buildWyomingResidentPrompt(params)
      : buildWyomingNRPrompt(params);
  }

  if (stateName === 'IDAHO') {
    return isResident
      ? buildIdahoResidentPrompt(params)
      : buildIdahoNRPrompt(params);
  }

  if (stateName === 'UTAH') {
    return buildUtahPrompt(params);
  }

  if (stateName === 'COLORADO') {
    return isResident
      ? buildColoradoResidentPrompt(params)
      : buildColoradoNRPrompt(params);
  }

  return buildGenericPrompt(params);
}

// ─── WYOMING ──────────────────────────────────────────────────────────────────

function buildWyomingNRPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, seasonLabel, knownAreas, scoutDataset } = p;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES — READ BEFORE ANYTHING ELSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 1 — SPECIAL POOL: If nrSpecialMinPoints <= ${hunterPoints}, the hunter CAN draw via special pool THIS YEAR. Tier = DRAW_NOW. currentOdds = nrSpecialOddsAtMin from data.

RULE 2 — REGION W IS ALWAYS DRAW_NOW: Region W has nrRegularMinPoints=1 (and often 0). Hunter has ${hunterPoints} points → Region W is DRAW_NOW at ~80-100%. It MUST appear in every set of recommendations.

RULE 3 — MINIMUM 7 RECOMMENDATIONS: You must return at least 7 units. Do not stop at 6.

RULE 4 — WHYFITS MUST BE UNIT-SPECIFIC: Use the actual unit name, drainage, and geographic location from the data. For GENERAL_REGION entries, cite specific notableUnits inside the region. Never write generic phrases like "terrain is suitable for backcountry hunting."

RULE 5 — UNIT KEY FORMAT: Wyoming deer general regions are single letters (A, B, C, D, F, G, H, J, K, L, M, Q, R, T, W, X, Y). Wyoming deer Limited Quota units have a "-1" suffix (141-1, 128-1, 102-1). Output the "unit" field exactly as it appears in the dataset's "unit" field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WYOMING NR DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wyoming NR elk/deer draw has FOUR pools:
1. Regular Pool — preference points. Accessible if nrRegularMinPoints <= ${hunterPoints}.
2. Special Pool — preference points. Accessible if nrSpecialMinPoints <= ${hunterPoints}.
3. Random Pool — zero points required. Odds = nrRandomOdds.
4. Special Random Pool — zero points required. Odds = nrSpecialRandomOdds.

ODDS CALCULATION — follow this exactly for every unit:

Step 1: Check pool access in priority order:
  A. Regular pool accessible? nrRegularMinPoints <= ${hunterPoints}
  B. Special pool accessible? nrSpecialMinPoints <= ${hunterPoints}
  C. Random + Special Random: always accessible

Step 2: Set currentOdds using BEST accessible pool:
  - Regular accessible + general region (A/B/C/D/F/G/H/J/K/L/M/Q/R/T/W/X/Y): currentOdds = "~100%", tier = DRAW_NOW
  - Regular accessible + limited unit (-1 suffix): currentOdds = nrRegularOddsAtMin from data, tier = DRAW_NOW
  - Regular NOT accessible + special accessible: currentOdds = nrSpecialOddsAtMin from data, tier = DRAW_NOW
  - Neither accessible: currentOdds = nrRandomOdds + nrSpecialRandomOdds (add the percentages), tier = RANDOM_PLAY / BUILD_AND_WAIT / LONG_GAME

Step 3: BUILD_AND_WAIT and LONG_GAME units still show random odds:
  - NEVER show "N/A" — always show combined random odds
  - Only "0% — no random pool tags available" if both random quotas are literally 0

Step 4: NEVER do this:
  - NEVER add nrMinPoints (a number of points) to nrRandomOdds (a percentage) — they are different things
  - NEVER show residentOdds as currentOdds for an NR hunter
  - NEVER show "N/A" when random pool odds exist
  - oddsDirection = "STABLE" unless two years of data show a clear directional change

FAMILIARITY MAPPING:
- Greys River / Star Valley = Region G or H general
- Greybull = Region Y (Bighorn Basin)
- Red Desert / Baggs = Region W
- Rock Springs / Aspen Mountain = Units 102-1, 101-1
- Dubois / Wind River Front = Unit 128-1 (late rut) or Region L general
- Wyoming Range / Hoback = Unit 141-1 or Region G
Reference these by name in whyItFits when relevant.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset is pre-filtered to this weapon type only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HUNTER PREFERENCE FILTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GUIDE REQUIREMENT:
- Units with requiresGuide=true legally require NR hunters to use a licensed Wyoming guide/outfitter (Wilderness Act).
- ALWAYS include this in tradeoffs for any requiresGuide unit: "GUIDE REQUIRED: NR hunters must use a licensed Wyoming outfitter. Budget $5,000-15,000+ for a guided hunt."
- Never recommend a requiresGuide unit without this warning in both drawFeasibility and tradeoffs.
- If huntStyle is backcountry DIY and requiresGuide=true: flag the conflict explicitly.

GRIZZLY COUNTRY — hunter said: ${p.grizzlyComfort ? 'OK with grizzly country' : 'EXCLUDE grizzly units'}
- ${p.grizzlyComfort ? 'Include grizzly country units normally. Note grizzly presence in whyItFits where relevant (bear spray, awareness, etc).' : 'EXCLUDE any unit where grizzlyPresence=true. If a grizzly unit would be top-ranked, note it was excluded and why in actionPlan.steps.'}

SPECIAL DRAW — hunter said: ${p.includeSpecialDraw ? 'Include special draw' : 'Exclude special draw (cost concern)'}
- ${p.includeSpecialDraw ? 'Use special pool odds normally in all calculations.' : 'Do NOT use nrSpecialMinPoints or nrSpecialOddsAtMin for currentOdds or tier. Use only regular and random pools.'}
${p.includeSpecialDraw ? '' : `- UPGRADE PATH NOTE: For any unit where nrSpecialMinPoints <= ${hunterPoints}, add to tradeoffs: "Special draw upgrade: applying to the special draw (~$50 extra) would give you [nrSpecialOddsAtMin] odds here." This is valuable intel the hunter should see even though they opted out.`}

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DRAW REALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Count from dataset:
- regularPoolUnits: units where nrRegularMinPoints <= ${hunterPoints} OR nrSpecialMinPoints <= ${hunterPoints}
- randomPoolUnits: units where combinedRandomOdds (nrRandomOdds + nrSpecialRandomOdds) > 3%
- pointsToNextUnit: minimum additional points to unlock the next best limited unit's regular pool

Assign strategyPath:
- "DRAW_NOW" if regularPoolUnits >= 1
- "RANDOM_PLAY" if 0 regular/special pool units but viable random options exist
- "BUILD_AND_WAIT" if 2-4 points from best realistic unit
- "LONG_GAME" if 5+ points away or odds very low everywhere

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SCORE UNITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DRAWABILITY (weight most heavily):
- Regular or special pool accessible this year = 8-10
- Combined random odds > 10% = 7-8
- Combined random odds 3-10% = 5-6
- Combined random odds 1-3% = 3-4
- Combined random odds < 1% = 1-2

${sharedScoringBlock(p)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DRAW_NOW: Lead with best drawable unit. List all regular/special pool options. Add random pool backups.
RANDOM_PLAY: Honest about low odds. List best combined random units. Recommend point banking.
BUILD_AND_WAIT: Exact points needed, approximate years, what to hunt in the meantime.
LONG_GAME: Straight talk, realistic timeline, diversification advice.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY — fill all slots, minimum 7 total:
SLOT 1-3: DRAW_NOW — regular or special pool accessible. MUST include Region W.
SLOT 4-5: RANDOM_PLAY — best combined random odds units.
SLOT 6-7: BUILD_AND_WAIT / LONG_GAME — trophy units worth building toward (e.g. 141-1, 102-1, 128-1).

- All units topEnd >= ${trophyFloor}" or flag the gap explicitly in tradeoffs
- currentOdds must follow the odds calculation rules above exactly
- tier: "DRAW_NOW" | "RANDOM_PLAY" | "BUILD_AND_WAIT" | "LONG_GAME"

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false)}
`.trim();
}

function buildWyomingResidentPrompt(p: ScoutPromptParams): string {
  const { trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;

  // Detect which general regions the hunter knows
  const generalRegionKeys = ['G','H','W','B','C','Y','R','X','L','K','D','F','A','J','M','Q','T'];
  const knownRegions = generalRegionKeys.filter(r =>
    new RegExp(`\\b${r}\\b`, 'i').test(knownAreas || '')
  );

  // Find the best topEnd among known general regions — OTC baseline
  let otcBaselineTopEnd = trophyFloor;
  if (Array.isArray(scoutDataset)) {
    for (const unit of scoutDataset) {
      const key = (unit.unit || '').toUpperCase();
      if (generalRegionKeys.includes(key)) {
        const topEndNum = parseInt((unit.topEnd || '0').replace(/[^0-9]/g, ''));
        if (topEndNum > otcBaselineTopEnd) otcBaselineTopEnd = topEndNum;
      }
    }
  }

  const knownLabel = knownRegions.length > 0 ? `Region ${knownRegions.join(' and ')}` : 'general regions';
  const hasKnownRegions = knownRegions.length > 0;

  const sep = '\u2501'.repeat(50);

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A WYOMING RESIDENT HUNT ANALYSIS. RESIDENT RULES ONLY — NO NR CONCEPTS ANYWHERE.

${sep}
WYOMING RESIDENT DRAW SYSTEM
${sep}

Wyoming residents draw limited tags via PURE RANDOM DRAW. That is the entire system.

- There are NO preference points for residents.
- There are NO draw pools of any kind.
- Every resident has identical odds regardless of past applications.
- The only metric that matters is "residentOdds" — tags available vs first-choice applicants.
- ALL Wyoming general regions (A, B, C, D, F, G, H, J, K, L, M, Q, R, T, W, X, Y) are effectively OTC for residents — no draw required, guaranteed access every year.

DO NOT MENTION anywhere in your output: points, preference points, NR pools, regular pool,
special pool, random pool, nrRegularMinPoints, nrRandomOdds, nrSpecialOdds, or any NR concept.

${sep}
UNIT KEY FORMAT (CRITICAL — OUTPUT MUST MATCH DATASET)
${sep}

The dataset uses these key formats. The "unit" field in your output MUST match exactly:
- General regions: single letter — "A", "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "Q", "R", "T", "W", "X", "Y"
- Limited Quota Type 1 (mule deer): "[areaNumber]-1" — e.g. "141-1", "128-1", "102-1", "87-1", "89-1", "130-1"
- Limited Quota Type 2: "[areaNumber]-2" — e.g. "60-2", "64-2", "119-2"

NEVER output just a bare number like "128" or "141" — always include the "-1" or "-2" suffix that appears in the dataset's "unit" field. The frontend will not render units that don't match the dataset keys exactly.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset is pre-filtered to this weapon type.

FAMILIARITY:
- Greys River / Star Valley = Region G or H
- Greybull = Region Y
- Red Desert / Baggs = Region W
- Dubois / Wind River Front = Unit 128-1 (late-Nov rut hunt) or Region L
- Rock Springs / Aspen Mountain = Unit 102-1
- Wyoming Range / Hoback = Unit 141-1
Reference by name in whyItFits.

${sep}
OTC BASELINE — READ THIS BEFORE SCORING ANYTHING
${sep}

${hasKnownRegions
  ? `This hunter already has guaranteed OTC access to ${knownLabel} (topEnd ${otcBaselineTopEnd}"+). They hunt these every year as a fallback. Their strategy is simple: apply for a limited quota unit that offers a meaningful trophy upgrade over what they already have guaranteed, then hunt OTC if they don't draw.

LIMITED QUOTA RECOMMENDATIONS MUST:
- Have topEnd that EXCEEDS ${otcBaselineTopEnd}" to be worth recommending
- Units with topEnd at or below ${otcBaselineTopEnd}" have zero value to this hunter — they already have access to units that good
- Units 78-1, 81-1, 125-1, 120-1, 36-1 and similar mid-tier units only qualify if their topEnd meaningfully beats ${otcBaselineTopEnd}"
- The right limited quota targets for this hunter are the elite units: 128-1 (Dubois rut, 200"+), 141-1 (Hoback, 200"+), 102-1 (Aspen Mountain, 200"+), 87-1 (Ferris, 190"+), 89-1 (Rattlesnake), 130-1 (Big Sandy, 205"+) — units where a tag is a genuine trophy upgrade`
  : `Wyoming residents have guaranteed OTC access to all general regions. Always note the best available general region as the guaranteed fallback, and only recommend limited quota units that offer a meaningful trophy upgrade.`
}

THE HUNTER'S STRATEGY:
1. Apply for the best limited quota unit worth a lottery application
2. Hunt OTC general region if they don't draw — guaranteed either way
Frame all recommendations around this explicitly.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

${sep}
STEP 1 — DRAW REALITY
${sep}

Count from dataset:
- DRAW_NOW: OTC general regions (always), OR limited quota residentOdds >= 15%
- BUILD_AND_WAIT: limited quota residentOdds 5-14%
- LONG_GAME: limited quota residentOdds < 5%

drawReality rules:
- regularPoolUnits = count of OTC general regions in the dataset + count of limited quota units where residentOdds >= 15%. OTC general regions are always drawable so they always count.
- randomPoolUnits = 0 always
- pointsToNextUnit = 0 always
- summary: lead with "You have guaranteed OTC access to [known regions]" then describe the limited quota upgrade options available

strategyPath: always "DRAW_NOW" for WY residents since OTC is always available

${sep}
STEP 2 — SCORE UNITS
${sep}

TROPHY UPGRADE FILTER — HARD RULE:
Only recommend limited quota units where topEnd EXCEEDS ${otcBaselineTopEnd}". If topEnd <= ${otcBaselineTopEnd}", do not recommend it.

1. DRAWABILITY:
- OTC general region = 10/10 (guaranteed, always DRAW_NOW)
- Limited quota residentOdds >= 20% = 8-9
- Limited quota residentOdds 10-20% = 6-7
- Limited quota residentOdds 5-10% = 4-5
- Limited quota residentOdds < 5% = 1-3

2. TROPHY UPGRADE VALUE (weight heavily for limited quota):
- topEnd exceeds OTC baseline by 15"+ = 9-10
- topEnd exceeds baseline by 5-14" = 6-8
- topEnd at or below baseline = EXCLUDE

${sharedScoringBlock(p)}

${sep}
STEP 3 — ACTION PLAN
${sep}

- Lead with: "You have guaranteed access to [known OTC regions] — that's your floor every year."
- Then present limited quota units as upgrade lottery plays
- Be honest about odds — "roughly 1-in-X chance each year"
- randomPoolPlays = the known OTC general region(s) — these are the guaranteed hunts
- pointBankingAdvice = "N/A — Wyoming residents do not use preference points."
- steps: frame as "Apply for X-1 as your upgrade lottery, hunt Region G/H either way." Be direct about odds — "Unit 128-1 draws about 1 in 90 years at current odds. Apply every year, hunt G/H in the meantime, and consider it a bonus when it comes in."

RECOMMENDATION REQUIREMENTS (minimum 7, ideally 8):
- MUST include ${knownLabel} as DRAW_NOW with terrain and trophy description
- MUST include at minimum: Unit 128-1 (Dubois/Wind River Front rut hunt, 200"+), Unit 141-1 (Hoback/Jackson, 200"+), Unit 102-1 (Aspen Mountain/Rock Springs, 200"+) — these are Wyoming's premier limited quota deer units and belong in every resident recommendation set when the hunter wants a trophy upgrade. Output these with the EXACT dataset keys "128-1", "141-1", "102-1" — never as bare numbers.
- MUST include 4-5 total limited quota units that beat ${otcBaselineTopEnd}" topEnd ceiling, ranked by odds
- DO NOT include any limited quota unit with topEnd at or below ${otcBaselineTopEnd}"
- currentOdds = residentOdds value exactly
- tier: for resident limited quota units — "DRAW_NOW" if residentOdds >= 15%, "BUILD_AND_WAIT" if 5-14%, "LONG_GAME" if under 5%. But always note in whyItFits that residents apply every year regardless — this is an annual lottery, not a multi-year wait.
- terrain field: 2-4 word descriptor ONLY (e.g. "Alpine canyon drainage", "High desert mesa", "Timbered river breaks") — never paste the full description string into the terrain field
- whyItFits for limited units: compare TYPICAL ranges to what the hunter sees in their known OTC regions, not just topEnd ceilings. Explain WHY this unit is a genuine upgrade — age class, genetics, remoteness, pressure levels, terrain type.
- whyItFits for GENERAL_REGION entries: cite specific notableUnits inside the region by name and area number. For example for Region G: "Includes Unit 143 (South Piney, core Wyoming Range alpine) and Unit 145 (Salt River Range on the Idaho border, Star Valley's home country)."

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(true)}
`.trim();
}


// ─── IDAHO ────────────────────────────────────────────────────────────────────

function buildIdahoNRPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;
  const drawChances = Math.pow(hunterPoints, 2) + 1;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS AN IDAHO NON-RESIDENT HUNT ANALYSIS. IDAHO DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDAHO NR DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idaho uses a BONUS POINT system:
- Draw chances = (points)^2 + 1
- Hunter has ${hunterPoints} points = ${drawChances} draw chances vs 1 chance for a 0-point hunter
- NR quota: typically 10% of controlled hunt tags per unit
- No secondary random or special pools — one unified weighted draw
- Leftover tags: available OTC after draw closes — first-come, no points needed
- General seasons: OTC for many units — no draw required

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Minimum 7 recommendations.
- MUST include at least 1 OTC or general season option as guaranteed fallback
- MUST include 2 premium controlled hunt units as BUILD_AND_WAIT or LONG_GAME
- currentOdds: approximate draw probability or "OTC — no draw required"
- All units topEnd >= ${trophyFloor}" or flag the gap
- Always mention leftover/OTC options as backup

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false)}
`.trim();
}

function buildIdahoResidentPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;
  const drawChances = Math.pow(hunterPoints, 2) + 1;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS AN IDAHO RESIDENT HUNT ANALYSIS.

Idaho uses a BONUS POINT system: draw chances = (points)^2 + 1.
Hunter has ${hunterPoints} points = ${drawChances} draw chances.
Residents receive a much larger quota allocation than NR — many units that are difficult for NR are very drawable for residents.
General seasons and OTC tags widely available.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Minimum 6 recommendations.
- MUST include at least 1 OTC general season option
- All units topEnd >= ${trophyFloor}" or flag the gap
- currentOdds reflects resident draw probability or "OTC"

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(true)}
`.trim();
}

// ─── UTAH ─────────────────────────────────────────────────────────────────────

function buildUtahPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, isResident, trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A UTAH ${isResident ? 'RESIDENT' : 'NON-RESIDENT'} HUNT ANALYSIS. UTAH DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UTAH DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Utah uses a LINEAR BONUS POINT system:
- Draw entries = bonus points + 1 (linear, not squared)
- Hunter has ${hunterPoints} points = ${hunterPoints + 1} draw entries
- ${isResident ? 'Resident quota: typically 90% of limited entry tags' : 'NR quota: strictly 10% of limited entry tags — very few available'}
- Limited Entry (LE): high demand, points required, trophy quality high
- General Season (GS): much easier to draw, lower trophy quality
- NR hunters are severely limited on premium LE tags — Utah is often a BUILD_AND_WAIT or LONG_GAME state for NR

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Minimum 6 recommendations.
- MUST include 1-2 general season options as near-term opportunity
- MUST include 2 premium LE units as BUILD_AND_WAIT or LONG_GAME targets
- All units topEnd >= ${trophyFloor}" or flag the gap
- Be explicit about NR quota reality for each LE unit
- currentOdds reflects actual draw probability based on points and NR applicant data

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(isResident)}
`.trim();
}

// ─── COLORADO ─────────────────────────────────────────────────────────────────

function buildColoradoNRPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;
  const isArchery = weaponLabel.includes('ARCHERY');

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A COLORADO NON-RESIDENT HUNT ANALYSIS. COLORADO DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COLORADO NR DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Colorado uses a PREFERENCE POINT system with two-phase draw:
Phase 1: Preference point holders drawn first (highest points first)
Phase 2: Remaining tags go to random (0-point) applicants

Hunter has ${hunterPoints} preference points.

KEY DISTINCTIONS:
- OTC (Over The Counter): Many units have unlimited licenses — no draw required
  ${isArchery ? '→ ARCHERY ELK IS WIDELY OTC STATEWIDE — major opportunity for this hunter' : '→ Rifle 2nd and 3rd seasons OTC in many GMUs'}
- Limited licenses: Controlled quota — preference points matter significantly
- FCFS (First Come First Served): Leftover licenses available after draw
- NR quota: varies by unit and season

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.
${isArchery ? 'NOTE: Always highlight OTC archery options — this is a major advantage in Colorado.' : ''}
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Minimum 7 recommendations.
- MUST include OTC options if available for this weapon type
- MUST include 2 premium limited license units as BUILD_AND_WAIT or LONG_GAME
- All units topEnd >= ${trophyFloor}" or flag the gap
- currentOdds: "OTC — no draw required" or approximate draw probability
- Be clear about OTC vs limited license distinction for each unit

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false)}
`.trim();
}

function buildColoradoResidentPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, knownAreas, scoutDataset } = p;
  const isArchery = weaponLabel.includes('ARCHERY');

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A COLORADO RESIDENT HUNT ANALYSIS.

Colorado preference point system. Hunter has ${hunterPoints} points.
Residents access same OTC licenses as NR. For limited licenses, residents and NR compete in same draw for their respective quotas.
${isArchery ? 'ARCHERY ELK IS WIDELY OTC STATEWIDE — always highlight this as a guaranteed option.' : ''}

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

Score and rank units. Minimum 6 recommendations.
- MUST include OTC options where available
- All units topEnd >= ${trophyFloor}" or flag the gap
- currentOdds: "OTC" for no-draw units, approximate % for limited licenses

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(true)}
`.trim();
}

// ─── GENERIC FALLBACK ─────────────────────────────────────────────────────────

function buildGenericPrompt(p: ScoutPromptParams): string {
  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(p.scoutDataset)}

Score and rank units for this hunter. Return at least 6 recommendations ranked by draw feasibility and trophy match.

1. DRAWABILITY — weight most heavily based on available draw data

${sharedScoringBlock(p)}

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(p.isResident)}
`.trim();
}