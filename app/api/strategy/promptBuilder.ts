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
  const isElk = p.speciesKey === 'ELK';
  const isDeer = p.speciesKey === 'DEER';

  // Deer general regions are letters (A-Y). Elk uses numeric area numbers
  // for both general-license and LQ. So the "known regions" detection only
  // makes sense for deer.
  const deerGeneralRegionKeys = ['G','H','W','B','C','Y','R','X','L','K','D','F','A','J','M','Q','T'];
  const knownDeerRegions = isDeer
    ? deerGeneralRegionKeys.filter(r =>
        new RegExp(`\\b${r}\\b`, 'i').test(p.knownAreas || '')
      )
    : [];
  const hasKnownDeerOTC = isResident && isDeer && knownDeerRegions.length > 0;
  const knownDeerLabel = knownDeerRegions.join('/');

  // For elk, detect if hunter mentioned places in their knownAreas string
  // that map to known general-license elk drainages (Greys River, Hoback,
  // Star Valley, Pinedale, etc.). This shifts the trophy comparison from
  // "Region G/H" to "general-license elk areas you hunt every year".
  const elkFamiliarPlaces = ['greys', 'hoback', 'star valley', 'pinedale', 'cora', 'alpine', 'thayne', 'afton'];
  const hasKnownElkAreas = isResident && isElk && elkFamiliarPlaces.some(p2 =>
    (p.knownAreas || '').toLowerCase().includes(p2)
  );

  // Build the species-appropriate trophy-comparison block.
  let trophyBlock: string;
  if (hasKnownDeerOTC) {
    trophyBlock = `This hunter already hunts Region ${knownDeerLabel} OTC. DO NOT say "tops out at 200"+ vs your OTC access at 200"+" — that comparison is meaningless when both numbers are the same.
   Instead: Compare the TYPICAL ranges. Region G typical is 165-185", Region H typical is 160-185".
   - Unit 128-1 typical is 170-185" with documented giants well above that — the difference is buck age class and remoteness, not just ceiling.
   - Unit 141-1 typical is 175-190" — a genuine step above what you'll typically encounter in G or H.
   - Unit 102-1 typical is 170-195" but produces a different genetic profile (deep desert bucks with extreme mass) that G/H don't offer.
   Write this as: "Typical bucks here run X-Y" — meaningfully [above/different from] what you see in Region G/H. The upgrade here is [specific reason: age class, genetics, pressure, terrain isolation, etc.]"`;
  } else if (hasKnownElkAreas) {
    trophyBlock = `This hunter has familiar general-license elk areas (${p.knownAreas}). They already have guaranteed access to general-license bulls every year, with typical mature bulls in the 270-300" range and occasional 320"+ bulls in good rut years.
   The point of recommending an LQ tag is to UPGRADE on that baseline. Don't pitch an LQ that produces the same quality as their general-license access — that's not an upgrade.
   When recommending LQ tags, frame it as: "Typical bulls here run X-Y" — explain HOW it's better than what they see on general-license hunts. Examples of legitimate elk LQ upgrades:
   - Premier trophy units (Area 7 Laramie Peak typical 320-350", Area 100 Red Desert 320-360", Area 16 Sunlight 320-350"): bigger typical bulls, older age classes, less pressure
   - Wilderness backcountry units (Area 30 Thorofare, Area 31 North Fork, Area 60 Thorofare archery): genuinely remote pack-in country with mature bulls
   - HYBRID upgrade tags: explicitly explain "you can hunt this area with general license during X dates; the LQ unlocks Y dates/geography for better access"
   The upgrade reasoning should be specific — age class, genetics, season window, geographic exclusivity, or wilderness access.`;
  } else if (isElk) {
    trophyBlock = `State the actual typical and top-end ranges from the data using elk-appropriate scoring (B&C / SCI). For elk, mature bulls are typically 270-310" with premier units producing 320-350"+. Be specific about what a good bull here actually looks like and what age class is achievable.`;
  } else {
    trophyBlock = `State the actual typical and top-end ranges from the data. Be specific about what a good animal here actually looks like.`;
  }

  // Terrain guidance also differs by species — deer uses notableUnits within
  // GENERAL_REGION entries; elk uses areaPattern (GENERAL_ONLY / HYBRID / LQ_ONLY).
  const terrainGuidance = isElk
    ? `Use the actual area name, drainage, and geographic location from the data. For elk, areas are numeric (e.g. "Area 7 Laramie Peak", "Area 100 Red Desert", "Area 56 Wapiti Ridge"). For HYBRID areas, explicitly note "you can hunt this area with general license during X dates; the LQ unlocks Y" — that's the value proposition. 2-4 word terrain descriptor only in the terrain field (e.g. "Alpine timber drainage", "Sage rim country", "Wilderness backcountry") — NOT the full description string.`
    : `Use the actual unit name, drainage, and geographic location from the data. For GENERAL_REGION entries, cite a specific notableUnit inside that region to anchor the geography — e.g. "Region G includes Unit 143 (South Piney, core Wyoming Range) and Unit 145 (Salt River Range on the Idaho border)". For LIMITED_QUOTA entries, the unit IS the geography. 2-4 word terrain descriptor only in the terrain field (e.g. "Alpine canyon drainage" or "High desert mesa country") — NOT the full description string.
   TROPHY-NUMBER HONESTY: When you cite a notableUnit's typical/topEnd and that notableUnit has trophyEstimated=true, present the figures as a REGION-LEVEL ESTIMATE (e.g. "this part of the region estimates around 160-175\" class") — never as a precise, measured, unit-specific figure. Only state trophy numbers as hard unit data when trophyEstimated is false or absent.`;

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

3. Terrain: ${terrainGuidance}

4. Known area connection: if the unit matches or borders "${p.knownAreas}", call it out by name.

5. Trophy reality — BE SPECIFIC AND HONEST:
   ${trophyBlock}

Every sentence must be specific to this unit and this hunter. No copy-paste between units.
`.trim();
}

export function sharedOutputSchema(isResident: boolean, speciesKey: string = 'DEER'): string {
  const isElk = speciesKey === 'ELK';
  const isAntelope = speciesKey === 'ANTELOPE';
  const unitKeyFormatRules = isAntelope
    ? `UNIT KEY FORMAT RULES (CRITICAL):
- Wyoming antelope tags use format "[areaNumber]-[type]" — e.g. "57-1", "23-2", "79-9", "50-0".
  - type=1: rifle (Any Antelope); type=2: alternate rifle season; type=9: archery; type=0: muzzleloader/handgun.
- Antelope has NO general regions and NO OTC — every product is a limited-quota area tag.
- The "unit" field in your output MUST match the dataset's "unit" key exactly — never strip the suffix, never output just the area number alone.`
    : isElk
    ? `UNIT KEY FORMAT RULES (CRITICAL):
- Wyoming elk Limited Quota tags use format "[areaNumber]-[huntType]" — e.g. "7-1" (Laramie Peak Any Elk Rifle), "100-1" (Red Desert), "16-1" (Sunlight), "30-1" (Thorofare), "38-9" (Piney Creek archery)
  - huntType=1: Any Elk Rifle
  - huntType=2: Type 2 (varies — Five-Point or alternate season)
  - huntType=3: Type 3 (varies — Spike or alternate)
  - huntType=4, 5: Antlerless management tags
  - huntType=6, 7: Cow/calf
  - huntType=9: Archery only
- Wyoming elk NR Region General licenses (NR ONLY — never recommend to residents): "Region E", "Region S", "Region W"
- The "unit" field in your output MUST match the dataset's "unit" key exactly — never strip the suffix, never output just the area number alone`
    : `UNIT KEY FORMAT RULES (CRITICAL):
- Wyoming deer general regions are single letters: "A", "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "Q", "R", "T", "W", "X", "Y"
- Wyoming deer Limited Quota units use suffix "-1" for Type 1 antlered tags (e.g. "141-1", "128-1", "102-1") and "-2" for Type 2 tags (e.g. "60-2", "64-2", "119-2")
- Wyoming deer Type 3 whitetail tags use suffix "-3" and may span multiple areas (e.g. "11-12-13-14-3")
- The "unit" field in your output MUST match the dataset's "unit" key exactly — never strip the suffix, never output just the area number alone
- For GENERAL_REGION entries: use the letter key ("G", "H", etc.) not a unit number inside that region`;

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
      "wildernessStatus": "NONE" | "PARTIAL" | "PRIMARY",
      "wildernessNote": string,
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

UNIT KEY FORMAT — see rules below.

drawableUnits RULES:
- Include EVERY unit from the dataset where regular pool OR special pool is accessible for this hunter (or residentOdds >= 15% for residents, or OTC general regions).
- This is a complete list — not curated. Include all of them even if not in recommendations.
- Keep each entry brief — just the fields listed above.
- poolType: "Regular" if regular pool accessible, "Special" if only special pool accessible, "OTC" if general region.
- Sort by currentOdds descending (highest odds first).
- wildernessStatus: copy directly from dataset field.
- wildernessNote: ${isResident ? 'empty string "" — wilderness/guide rules do not apply to residents.' : 'If wildernessStatus="NONE", empty string "". If "PARTIAL" or "PRIMARY", use the guideRuleForNR text directly from the dataset.'}
- grizzlyPresence: copy directly from dataset field.

${unitKeyFormatRules}`.trim();
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

export function buildScoutPrompt(params: ScoutPromptParams): string {
  const { stateName, isResident, speciesKey } = params;

  if (stateName === 'WYOMING') {
    if (speciesKey === 'ELK') {
      return isResident
        ? buildWyomingElkResidentPrompt(params)
        : buildWyomingElkNRPrompt(params);
    }
    if (speciesKey === 'ANTELOPE') {
      return isResident
        ? buildWyomingAntelopeResidentPrompt(params)
        : buildWyomingAntelopeNRPrompt(params);
    }
    // Default Wyoming branch is deer (covers DEER and any species without
    // a dedicated branch — which falls back to the deer prompts since they're
    // the most thorough)
    return isResident
      ? buildWyomingDeerResidentPrompt(params)
      : buildWyomingDeerNRPrompt(params);
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

// ─── WYOMING DEER ─────────────────────────────────────────────────────────────

function buildWyomingDeerNRPrompt(p: ScoutPromptParams): string {
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

WILDERNESS / GUIDE REQUIREMENT (Wyoming Statute 23-2-401):
- Each unit has a "wildernessStatus" field: "NONE", "PARTIAL", or "PRIMARY".
- wildernessStatus="NONE": no federal wilderness in the unit. Do NOT mention guides, wilderness, or Statute 23-2-401 anywhere in the output for this unit.
- wildernessStatus="PARTIAL": the unit contains or borders federal wilderness but has substantial DIY-legal non-wilderness country. In tradeoffs, include the guideRuleForNR text from the dataset. Do NOT frame this as "you need a guide" — frame it as "here's the boundary rule and here's what's DIY-legal". If huntStyle is backcountry DIY, encourage focusing on the non-wilderness portions rather than flagging a conflict.
- wildernessStatus="PRIMARY": the unit is defined by wilderness. In tradeoffs, include the guideRuleForNR text AND add: "This unit is a guided-only hunt for nonresidents. Budget $5,000–15,000+." If huntStyle is backcountry DIY, flag the conflict explicitly and note that NR DIY is not viable here.
- wildernessAreas: use the wilderness area names in whyItFits when relevant (e.g. "the Bridger Wilderness headwaters" for Area 135).
- NEVER apply any wilderness/guide rule to a resident hunter. This entire section is NR-only.

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

function buildWyomingDeerResidentPrompt(p: ScoutPromptParams): string {
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

WILDERNESS / GUIDE RULES DO NOT APPLY TO RESIDENTS. The Wyoming Statute 23-2-401 guide requirement is nonresident-only. Do NOT mention guides, wilderness guide requirements, outfitters, or Statute 23-2-401 anywhere in the output. The dataset includes wildernessStatus and wildernessAreas fields on every unit — treat these as NR-only metadata and ignore them entirely in resident output. Set wildernessNote to empty string "" for every unit in drawableUnits. You may still mention geographic wilderness areas as terrain descriptors when relevant (e.g. "Bridger Wilderness headwaters" as a place name), but never as a legal/regulatory barrier.

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


// ─── WYOMING ANTELOPE ─────────────────────────────────────────────────────────
// Antelope is all limited-quota by area: no general regions, no OTC, no
// wilderness/guide rules. NR uses the same 4-pool draw as deer/elk; residents
// draw via pure random (no points).

function buildWyomingAntelopeNRPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, scoutDataset } = p;
  const sep = '━'.repeat(50);

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

${sep}
WYOMING NONRESIDENT ANTELOPE — CRITICAL RULES
${sep}

Wyoming antelope is ENTIRELY limited quota by hunt area. There are NO general or
OTC antelope licenses, and NO wilderness/guide requirements — antelope live in
open sage and desert country that is DIY-legal for nonresidents. Do NOT mention
general regions, Region E/S/W, wilderness, or guide rules anywhere.

NR ANTELOPE 4-POOL DRAW SYSTEM (same mechanics as deer/elk):
1. Regular Pool — preference points. Accessible if nrRegularMinPoints <= ${hunterPoints}.
2. Special Pool — preference points (costs more). Accessible if nrSpecialMinPoints <= ${hunterPoints}.
3. Random Pool — zero points. Odds = nrRandomOdds.
4. Special Random Pool — zero points. Odds = nrSpecialRandomOdds.

ODDS CALCULATION — follow exactly for every area:
Step 1 — pool access in priority order:
  A. Regular accessible? nrRegularMinPoints <= ${hunterPoints}
  B. Special accessible? nrSpecialMinPoints <= ${hunterPoints}
  C. Random + Special Random: always accessible
Step 2 — currentOdds from the BEST accessible pool:
  - Regular accessible: currentOdds = nrRegularOddsAtMin, tier = DRAW_NOW
  - Else special accessible: currentOdds = nrSpecialOddsAtMin, tier = DRAW_NOW
  - Neither: currentOdds = nrRandomOdds + nrSpecialRandomOdds (add the percentages), tier = RANDOM_PLAY / BUILD_AND_WAIT / LONG_GAME
Step 3 — NEVER:
  - add a points number (minPoints) to a percentage (odds)
  - show residentOdds as currentOdds for an NR hunter
  - show "N/A" when random pool odds exist
  - oddsDirection must be "STABLE" (only one year of data is available)

RULE — MINIMUM 7 RECOMMENDATIONS. RULE — whyItFits must cite the actual area number and description from the data.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset is pre-filtered to this weapon type.

TROPHY DATA HONESTY: Most areas have trophyEstimated=true — their typical/topEnd are
placeholder statewide estimates, not field-sourced per-area numbers. When trophyEstimated
is true, present trophy ranges as a rough statewide estimate and say plainly that per-area
trophy data is still being built. Never present an estimate as a precise measured figure.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

${sep}
STEP 1 — DRAW REALITY
${sep}
- regularPoolUnits: areas where nrRegularMinPoints <= ${hunterPoints} OR nrSpecialMinPoints <= ${hunterPoints}
- randomPoolUnits: areas where (nrRandomOdds + nrSpecialRandomOdds) > 3%
- pointsToNextUnit: minimum additional points to unlock the next better area's regular pool
strategyPath: "DRAW_NOW" if regularPoolUnits >= 1; else "RANDOM_PLAY" if viable random options; else "BUILD_AND_WAIT" (2-4 pts away) / "LONG_GAME" (5+).

${sep}
STEP 2 — SCORE UNITS
${sep}
1. DRAWABILITY (weight most heavily):
- Regular or special pool accessible this year = 8-10
- Combined random odds > 10% = 7-8; 3-10% = 5-6; 1-3% = 3-4; < 1% = 1-2
${sharedScoringBlock(p)}

${sep}
STEP 3 — ACTION PLAN
${sep}
DRAW_NOW: lead with the best accessible area; list all regular/special options; add random backups.
RANDOM_PLAY: be honest about low odds; list best combined-random areas; recommend point banking.
BUILD_AND_WAIT / LONG_GAME: exact points needed and approximate years.

RECOMMENDATION REQUIREMENTS (minimum 7):
- Mix accessible DRAW_NOW areas and aspirational high-point premium areas.
- currentOdds follows the odds rules above; tier set accordingly.
- topEnd >= ${trophyFloor}" or flag the gap in tradeoffs (and note trophy is an estimate).

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false, 'ANTELOPE')}
`.trim();
}

function buildWyomingAntelopeResidentPrompt(p: ScoutPromptParams): string {
  const { trophyFloor, weaponLabel, scoutDataset } = p;
  const sep = '━'.repeat(50);

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A WYOMING RESIDENT ANTELOPE ANALYSIS. RESIDENT RULES ONLY — NO NR CONCEPTS ANYWHERE.

${sep}
WYOMING RESIDENT ANTELOPE DRAW SYSTEM
${sep}

Wyoming antelope is entirely limited quota by hunt area. Residents draw via PURE RANDOM DRAW.
- There are NO preference points for residents and NO draw pools of any kind.
- Every resident has identical odds. The only metric is residentOdds — tags vs first-choice applicants.
- There are NO general/OTC antelope licenses and NO wilderness/guide rules.

DO NOT MENTION anywhere: points, preference points, NR pools, regular/special/random pools,
nrRegularMinPoints, nrRandomOdds, or any nonresident concept.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset is pre-filtered to this weapon type.

TROPHY DATA HONESTY: Most areas have trophyEstimated=true — their typical/topEnd are
placeholder statewide estimates, not field-sourced. Present those as rough estimates and say
plainly that per-area trophy data is still being built. Never present an estimate as precise truth.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

${sep}
STEP 1 — DRAW REALITY
${sep}
- DRAW_NOW: residentOdds >= 15%
- BUILD_AND_WAIT: residentOdds 5-14% (but residents apply every year — this is an annual lottery, not a points wait)
- LONG_GAME: residentOdds < 5%
drawReality: regularPoolUnits = count of areas with residentOdds >= 15%; randomPoolUnits = 0; pointsToNextUnit = 0.
strategyPath: always "DRAW_NOW" — you can always apply; the question is which area is the best lottery.

${sep}
STEP 2 — SCORE UNITS
${sep}
1. DRAWABILITY:
- residentOdds >= 30% = 9-10; 15-30% = 7-8; 5-15% = 4-6; < 5% = 1-3
${sharedScoringBlock(p)}

${sep}
STEP 3 — ACTION PLAN
${sep}
- Lead with the highest-odds areas as the realistic plays this year.
- Present premium low-odds areas as annual lottery upgrades, with honest odds ("roughly 1-in-X each year").
- pointBankingAdvice = "N/A — Wyoming residents do not use preference points for antelope."

RECOMMENDATION REQUIREMENTS (minimum 7):
- Mix high-odds drawable areas and premium low-odds lottery areas.
- currentOdds = residentOdds exactly.
- topEnd >= ${trophyFloor}" or flag the gap (and note trophy is an estimate).

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(true, 'ANTELOPE')}
`.trim();
}


// ─── WYOMING ELK ──────────────────────────────────────────────────────────────

function buildWyomingElkResidentPrompt(p: ScoutPromptParams): string {
  const { trophyFloor, weaponLabel, seasonLabel, knownAreas, scoutDataset } = p;

  // Build a quick reference list of GENERAL_ONLY and HYBRID areas for the
  // prompt. The dataset entries already carry pattern info via the adapter.
  const generalOnlyAreas: string[] = [];
  const hybridAreas: string[] = [];
  const lqOnlyAreas: string[] = [];

  if (Array.isArray(scoutDataset)) {
    const seenAreas = new Set<string>();
    for (const entry of scoutDataset) {
      const areaNum = entry.unitNumber ?? entry.unit?.split('-')[0];
      if (!areaNum || seenAreas.has(areaNum)) continue;
      seenAreas.add(areaNum);
      if (entry.areaPattern === 'GENERAL_ONLY') generalOnlyAreas.push(areaNum);
      else if (entry.areaPattern === 'HYBRID') hybridAreas.push(areaNum);
      else if (entry.areaPattern === 'LQ_ONLY') lqOnlyAreas.push(areaNum);
    }
  }

  const sep = '\u2501'.repeat(50);

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS A WYOMING RESIDENT ELK HUNT ANALYSIS. RESIDENT RULES ONLY — NO NR CONCEPTS ANYWHERE.

${sep}
WYOMING RESIDENT ELK SYSTEM
${sep}

Wyoming residents have THREE distinct ways to hunt elk:

1. STATEWIDE GENERAL ELK LICENSE (Pattern: GENERAL_ONLY areas)
   - Single statewide license valid in any area listed with a "Gen" entry in WGFD Chapter 7 Section 2
   - GENERAL_ONLY areas in this dataset: ${generalOnlyAreas.join(', ') || '(check dataset)'}
   - These areas are guaranteed access every year — no draw competition for the access itself
   - The general license follows hunt-area-specific season dates (some areas have staged any-elk → antlered → antlerless windows)
   - This is the resident's GUARANTEED HUNT every year

2. LIMITED QUOTA UPGRADE — HYBRID AREAS (Pattern: HYBRID)
   - Areas where BOTH a general license AND a Type 1/2 LQ tag exist
   - HYBRID areas in this dataset: ${hybridAreas.join(', ') || '(none in dataset)'}
   - The general license gets you in during one window; the LQ tag unlocks a different (usually better) window: extended dates, late-season rut, private-land access, or geographic portions closed to general license hunters
   - The LQ tag is a TRUE upgrade play — you can hunt the general window every year for free, but the LQ unlocks something better
   - Frame these as "you have general access during X dates; the LQ unlocks Y dates/geography"

3. LIMITED QUOTA TROPHY — LQ_ONLY AREAS (Pattern: LQ_ONLY)
   - Areas with NO general license access — must draw the LQ tag to hunt antlered
   - LQ_ONLY areas in this dataset: ${lqOnlyAreas.slice(0, 20).join(', ')}${lqOnlyAreas.length > 20 ? '...' : ''}
   - These are where the trophy units live — Laramie Peak (7), Sunlight (16, 51), Thorofare (30, 60), North Fork (31), Wapiti Ridge (56), Piney Creek (38), Wood River (63), Red Desert (100)
   - Pure draw lottery for residents — every resident has identical odds, no preference points
   - Frame these as "annual lottery plays for trophy upgrades"

DO NOT MENTION anywhere in your output: points, preference points, NR pools, regular pool,
special pool, random pool, nrRegularMinPoints, nrRandomOdds, nrSpecialOdds, or any NR concept.

WILDERNESS / GUIDE RULES DO NOT APPLY TO RESIDENTS. The Wyoming Statute 23-2-401 guide requirement is nonresident-only. Do NOT mention guides, wilderness guide requirements, outfitters, or Statute 23-2-401 anywhere in the output. Wilderness areas can still be referenced as terrain/place names (e.g. "Washakie Wilderness backcountry") but never as a legal/regulatory barrier.

${sep}
UNIT KEY FORMAT (CRITICAL — OUTPUT MUST MATCH DATASET)
${sep}

Wyoming elk dataset uses these key formats. The "unit" field in your output MUST match exactly:
- Limited Quota tags: "[areaNumber]-[huntType]" — e.g. "7-1", "16-1", "100-1", "30-1", "31-1"
  - huntType=1 = Any Elk Rifle
  - huntType=2 = Five-Point or Type 2 Rifle (varies by area)
  - huntType=3 = Spike or Type 3 Rifle (varies)
  - huntType=4, 5 = Antlerless management tags
  - huntType=6, 7 = Cow/calf
  - huntType=9 = Archery only
- General Region (NR-only — IGNORE for resident output): "Region E", "Region S", "Region W"
  - These are NONRESIDENT region general license areas. Residents do NOT use these — residents have a single statewide general license.

NEVER recommend "Region E", "Region S", or "Region W" to a resident hunter — those are NR-only constructs that don't apply to residents.

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset is pre-filtered to this weapon type.
SEASON PREFERENCE: ${seasonLabel}.

FAMILIARITY MAPPING:
- Greys River / Star Valley = Areas 88 (Greys Feedground), 89 (Lower Greys), 90 (Upper Greys), 91 (Salt River)
- Hoback / Bondurant = Areas 84 (Lower Hoback HYBRID), 87 (Raspberry Ridge HYBRID), 86 (Monument Ridge GENERAL_ONLY)
- Pinedale / Cora = Areas 92, 93, 96, 97, 98 (mostly HYBRID with extended LQ dates)
- Cody area = Areas 51 (Sunlight), 54 (Bald Ridge), 55 (Grinnell), 56 (Wapiti Ridge HYBRID), 58 (Sage Creek), 59 (Boulder Basin HYBRID), 65 (Heart Mountain)
- Dubois / Wind River = Areas 67, 68, 69 (general staged dates)
- Bighorn Mountains = Areas 33, 34, 35, 36, 37, 38, 39, 40, 41, 45, 47, 48, 49
- Laramie Peak = Area 7 (LQ_ONLY, premier trophy)
- Red Desert = Area 100 (LQ_ONLY, premier trophy)

${sep}
OTC BASELINE — READ THIS BEFORE SCORING ANYTHING
${sep}

Wyoming residents have GUARANTEED ACCESS every year via the statewide General Elk License to all GENERAL_ONLY and HYBRID areas. That's their floor.

Their strategy is simple:
1. Hunt with general license in the area(s) they know best — guaranteed every year
2. Apply for ONE LQ tag (Type 1, 2, or 3) as their annual "upgrade lottery" — either to unlock better dates in a HYBRID area or to access a LQ_ONLY trophy unit they couldn't hunt otherwise

LQ RECOMMENDATIONS MUST:
- Either be in a LQ_ONLY area (genuine new access) OR a HYBRID area (genuine upgrade over general license)
- Have meaningful trophy potential or genuinely unique access value
- The premier LQ_ONLY trophy targets are Area 7 (Laramie Peak), Area 100 (Red Desert), Area 16 (Sunlight), Area 30 (Thorofare), Area 31 (North Fork), Area 38 (Piney Creek), Area 63 (Wood River), Area 56 (Wapiti Ridge), Area 58 (Ishawoa)
- Also strong: 51 (Sunlight-Crandall), 54 (Bald Ridge), 55 (Grinnell), 62 (South Greybull), 22 (Ferris), 124 (Powder Rim), 111 (Seminoe)

THE HUNTER'S STRATEGY:
1. Apply for one premier LQ tag worth a lottery application
2. Hunt their familiar general-license area if they don't draw — guaranteed either way
3. For HYBRID areas they already know, applying for the LQ unlocks a meaningful upgrade

Frame all recommendations around this explicitly.

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

${sep}
STEP 1 — DRAW REALITY
${sep}

Count from dataset:
- DRAW_NOW: GENERAL_ONLY areas (always — guaranteed via general license), HYBRID areas accessed via general license, OR LQ tags where residentOdds >= 15%
- BUILD_AND_WAIT: LQ tags with residentOdds 5-14%
- LONG_GAME: LQ tags with residentOdds < 5%

drawReality rules:
- regularPoolUnits = count of GENERAL_ONLY areas + count of HYBRID areas (always drawable via general) + count of LQ tags with residentOdds >= 15%
- randomPoolUnits = 0 always
- pointsToNextUnit = 0 always
- summary: lead with "You have guaranteed statewide general license access. The strategic question is which one LQ tag to apply for as your upgrade lottery."

strategyPath: always "DRAW_NOW" for WY residents since general license is always available

${sep}
STEP 2 — SCORE UNITS
${sep}

1. DRAWABILITY:
- GENERAL_ONLY area (resident hunts free) = 10/10, always DRAW_NOW
- HYBRID area accessed via general license = 9/10, always DRAW_NOW
- HYBRID area LQ tag (upgrade) = score by residentOdds: >=20% = 8-9, 10-20% = 6-7, 5-10% = 4-5, <5% = 1-3
- LQ_ONLY tag = score by residentOdds: >=20% = 8-9, 10-20% = 6-7, 5-10% = 4-5, <5% = 1-3 (but always include premier trophy LQs even at low odds — they're the lottery upgrade)

2. TROPHY UPGRADE VALUE (weight heavily for LQ recommendations):
- Premier trophy LQ_ONLY (7-1, 100-1, 16-1, 30-1, 31-1, 38-1, 56-1, 58-1, 63-1) = 9-10 even at low odds
- HYBRID upgrade unlocking rut window or extended dates = 7-9
- LQ_ONLY mid-tier (e.g. 33-1 accessible draws) = 5-7

${sharedScoringBlock(p)}

${sep}
STEP 3 — ACTION PLAN
${sep}

- Lead with: "You have guaranteed access to the general license — that's your floor every year. Pick the area you know best as your guaranteed hunt."
- Then present LQ recommendations as upgrade lottery plays
- Be honest about LQ odds — "roughly 1-in-X chance each year"
- randomPoolPlays = the resident's familiar general-license area(s) — these are the guaranteed hunts
- pointBankingAdvice = "N/A — Wyoming residents do not use preference points for elk."
- steps: frame as "Apply for [premier LQ] as your upgrade lottery, hunt [familiar general area] either way. Unit 7-1 draws about 1 in 4 years for residents at current odds — better than most premier units. Apply every year and you'll likely draw within 5-10 attempts."

RECOMMENDATION REQUIREMENTS (minimum 7, ideally 8):
- MUST include at least 2 GENERAL_ONLY or HYBRID-via-general entries that match the hunter's familiar area or hunt style — these are the guaranteed-each-year hunts
- MUST include 4-5 LQ tags as upgrade lottery plays
- Include at minimum 2 premier trophy LQs (Area 7, 16, 100, 30, 31, 38, 56, 63) — these are Wyoming's most coveted resident elk hunts
- For HYBRID areas: explicitly explain the upgrade in whyItFits — "you can hunt this area with general license during X dates; this LQ tag unlocks Y dates/geography"
- currentOdds = residentOdds value exactly for LQ tags; "OTC — general license valid" for GENERAL_ONLY entries
- tier: GENERAL_ONLY/HYBRID-via-general = "DRAW_NOW"; LQ residentOdds >= 15% = "DRAW_NOW"; 5-14% = "BUILD_AND_WAIT"; under 5% = "LONG_GAME". But always note in whyItFits that residents apply every year regardless — this is annual lottery, not a multi-year wait.
- terrain field: 2-4 word descriptor ONLY (e.g. "Alpine timber drainage", "Sage rim country", "Wilderness backcountry") — never paste the full description string into the terrain field
- whyItFits MUST be specific to the area, not generic. Cite the actual drainage names, mountain ranges, and geographic features from the dataset's description.

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(true, 'ELK')}
`.trim();
}

function buildWyomingElkNRPrompt(p: ScoutPromptParams): string {
  const { hunterPoints, trophyFloor, weaponLabel, seasonLabel, knownAreas, scoutDataset } = p;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WYOMING NONRESIDENT ELK — CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NR ELK ACCESS HAS TWO PATHS:
1. NR REGION GENERAL LICENSE (Eastern, Southern, Western regions)
   - Eastern: Areas 2, 3, 6, 116, 126, 129 (1000 quota)
   - Southern: Areas 9, 10, 12, 13, 15, 21, 105-107, 110, 130 (1050 quota)
   - Western: Areas 28, 36, 37, 56, 59, 60, 66-71, 73, 77, 78, 80-87, 89-92, 94, 96-98, 102-104, 127, 128 (2775 quota)
   - These are draw via the four-pool system (regular/special/random/special random)
   - "Region W" in the dataset = Western Region (largest NR quota, 4-point clearing in regular pool)

2. NR LIMITED QUOTA TAGS (specific area, specific hunt type)
   - Same four-pool draw system as deer/region
   - Premier trophy LQs: 7-1 (Laramie Peak), 100-1 (Red Desert), 16-1 (Sunlight), 30-1 (Thorofare), 31-1 (North Fork), 38-1 (Piney Creek), 56-1 (Wapiti Ridge), 58-1 (Ishawoa), 63-1 (Wood River)

RULE 1 — REGION W IS THE NR BACKBONE: Region W has nrRegularMinPoints=4. Hunter has ${hunterPoints} points. ${hunterPoints}>=4 → Region W is DRAW_NOW at ~100%. It MUST appear in every set of recommendations.

RULE 2 — SPECIAL POOL: If nrSpecialMinPoints <= ${hunterPoints}, the hunter CAN draw via special pool THIS YEAR. Tier = DRAW_NOW. currentOdds = nrSpecialOddsAtMin from data.

RULE 3 — MINIMUM 7 RECOMMENDATIONS: You must return at least 7 units. Do not stop at 6.

RULE 4 — WHYFITS MUST BE UNIT-SPECIFIC: Use the actual area name, drainage, and geographic location from the data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WYOMING NR ELK 4-POOL DRAW SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Same as deer:
1. Regular Pool — preference points. Accessible if nrRegularMinPoints <= ${hunterPoints}.
2. Special Pool — preference points. Accessible if nrSpecialMinPoints <= ${hunterPoints}.
3. Random Pool — zero points required. Odds = nrRandomOdds.
4. Special Random Pool — zero points required. Odds = nrSpecialRandomOdds.

ODDS CALCULATION — follow this exactly:

Step 1: Check pool access in priority order:
  A. Regular pool accessible? nrRegularMinPoints <= ${hunterPoints}
  B. Special pool accessible? nrSpecialMinPoints <= ${hunterPoints}
  C. Random + Special Random: always accessible

Step 2: Set currentOdds using BEST accessible pool:
  - Regular accessible + Region (Region E/S/W): currentOdds = "~100%", tier = DRAW_NOW
  - Regular accessible + LQ tag (e.g. 7-1, 100-1): currentOdds = nrRegularOddsAtMin, tier = DRAW_NOW
  - Regular NOT accessible + special accessible: currentOdds = nrSpecialOddsAtMin, tier = DRAW_NOW
  - Neither accessible: currentOdds = sum of nrRandomOdds + nrSpecialRandomOdds, tier = RANDOM_PLAY/BUILD_AND_WAIT/LONG_GAME

Step 3: NEVER do this:
  - NEVER add nrMinPoints (number) to nrRandomOdds (percentage)
  - NEVER show residentOdds as currentOdds for an NR hunter
  - NEVER show "N/A" when random pool odds exist
  - oddsDirection = "STABLE" unless two years of data show clear directional change

UNIT KEY FORMAT:
- LQ tags: "[areaNumber]-[huntType]" (e.g. "7-1", "100-1", "30-1")
- Region General: "Region E", "Region S", "Region W"
- The "unit" field in output MUST match dataset's "unit" field exactly

WEAPON FILTER: Hunter selected ${weaponLabel}. Dataset pre-filtered.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WILDERNESS / GUIDE RULES (NR ONLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each unit has a "wildernessStatus" field for Wyoming Statute 23-2-401:
- wildernessStatus="NONE" or unset: no federal wilderness — silent on guides
- wildernessStatus="PARTIAL": contains/borders federal wilderness but DIY-legal portions exist — explain the boundary rule + DIY alternative in tradeoffs
- wildernessStatus="PRIMARY" or requiresGuide=true: defined by wilderness — NR DIY not viable, budget $5,000-15,000+ for guided

If huntStyle is backcountry DIY and wilderness rules apply: be honest about the constraint.

GRIZZLY COUNTRY — hunter said: ${p.grizzlyComfort ? 'OK with grizzly country' : 'EXCLUDE grizzly units'}
- ${p.grizzlyComfort ? 'Include grizzly country units normally. Note grizzly presence in whyItFits where relevant.' : 'EXCLUDE any unit where grizzlyPresence=true. If a grizzly unit would be top-ranked, note exclusion in actionPlan.steps.'}

SPECIAL DRAW — hunter said: ${p.includeSpecialDraw ? 'Include special draw' : 'Exclude special draw (cost concern)'}
- ${p.includeSpecialDraw ? 'Use special pool odds normally.' : 'Do NOT use nrSpecialMinPoints or nrSpecialOddsAtMin. Use only regular and random pools.'}

FAMILIARITY MAPPING:
- Greys River / Star Valley = Region W or Areas 88, 89, 90, 91 LQs
- Hoback = Region W (Area 84 is in Western Region) or Area 84/87 LQs
- Pinedale / Cora = Region W or Areas 92, 93, 96, 97, 98 LQs
- Cody area = LQs in 51, 54, 55, 56, 58 (NOT in any general region)
- Laramie Peak = Area 7 LQ (huge quota, drawable)
- Red Desert = Area 100 LQ (premier, ~18 points)

${sharedHunterProfile(p)}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DRAW REALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Count from dataset:
- regularPoolUnits: units where nrRegularMinPoints <= ${hunterPoints} OR nrSpecialMinPoints <= ${hunterPoints}
- randomPoolUnits: units where combined random odds > 3%
- pointsToNextUnit: minimum additional points to unlock the next best LQ

strategyPath:
- "DRAW_NOW" if regularPoolUnits >= 1
- "RANDOM_PLAY" if 0 regular/special access but viable random options
- "BUILD_AND_WAIT" if 2-4 points away from realistic LQ
- "LONG_GAME" if 5+ points from premier units

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — SCORE UNITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DRAWABILITY:
- Regular or special pool accessible this year = 8-10
- Combined random odds > 10% = 7-8
- Combined random odds 3-10% = 5-6
- Combined random odds 1-3% = 3-4
- Combined random odds < 1% = 1-2

${sharedScoringBlock(p)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MANDATORY — fill all slots, minimum 7 total:
SLOT 1-3: DRAW_NOW — regular/special accessible. MUST include Region W.
SLOT 4-5: RANDOM_PLAY — best combined random odds units.
SLOT 6-7: BUILD_AND_WAIT / LONG_GAME — premier trophy LQs (e.g. 7-1, 100-1, 30-1, 38-1).

- All units typical >= ${trophyFloor}" or flag the gap explicitly in tradeoffs (elk scores, not deer)
- currentOdds must follow odds calculation rules exactly
- tier: "DRAW_NOW" | "RANDOM_PLAY" | "BUILD_AND_WAIT" | "LONG_GAME"

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false, 'ELK')}
`.trim();
}


// ─── IDAHO ────────────────────────────────────────────────────────────────────

function buildIdahoNRPrompt(p: ScoutPromptParams): string {
  const { trophyFloor, knownAreas, scoutDataset } = p;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS AN IDAHO NON-RESIDENT HUNT ANALYSIS. IDAHO DRAW RULES ONLY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDAHO NR DRAW SYSTEM — PURE RANDOM, NO POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idaho controlled hunts are a PURE RANDOM draw. There are NO preference or bonus points — never mention points, "building points", or weighted chances. Every year is an independent lottery; waiting does not improve odds.
- Non-residents have a capped allocation (≈10% of a hunt's tags). Each hunt in the data has its real non-resident odds — use them.
- Leftover controlled-hunt tags sell OTC after the draw (first-come, no draw).
- GENERAL SEASONS: most Idaho deer & elk units have general/OTC tags that need NO draw — these are guaranteed fallbacks.

DATASET: each entry is one controlled hunt with: unit (hunt area), huntNumber, gmu, zone, tags, firstChoiceApplicants, residentOdds, nonResidentOdds, overallOdds. For a NON-RESIDENT, currentOdds = the hunt's nonResidentOdds.

FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE CONTROLLED HUNTS (real ${'2025'} draw odds):
${JSON.stringify(scoutDataset)}

Score and rank. Minimum 7 recommendations.
- currentOdds MUST equal the hunt's nonResidentOdds from the data — never invent odds.
- NO POINTS: set nrMinPoints to 0 for every unit; set nrRandomOdds to the hunt's nonResidentOdds.
- Tier by probability (NOT points): nonResidentOdds ≥ 20% → DRAW_NOW; 8–20% → RANDOM_PLAY; < 8% → BUILD_AND_WAIT or LONG_GAME (a low-odds lottery, framed honestly).
- MUST include at least 1 GENERAL-SEASON / OTC option as a guaranteed fallback: poolType "OTC", currentOdds "OTC — no draw required".
- The "unit" field in your output MUST equal the dataset entry's "unit" (hunt area) EXACTLY. Ignore the Wyoming key-format rules below — they do not apply to Idaho.
- topEnd/typicalScore are not in the data; give realistic Idaho estimates and flag they are estimates. Flag any below ${trophyFloor}".

${sharedWhyItFitsRules(p)}

${sharedOutputSchema(false)}
`.trim();
}

function buildIdahoResidentPrompt(p: ScoutPromptParams): string {
  const { trophyFloor, knownAreas, scoutDataset } = p;

  return `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience.

THIS IS AN IDAHO RESIDENT HUNT ANALYSIS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDAHO RESIDENT DRAW SYSTEM — PURE RANDOM, NO POINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idaho controlled hunts are a PURE RANDOM draw — there are NO preference or bonus points. Never mention points or "building points". Every year is an independent lottery.
- Residents receive the large majority of controlled-hunt tags, so resident odds are much better than non-resident. Use each hunt's residentOdds.
- GENERAL SEASONS and OTC tags are widely available to residents — guaranteed fallbacks, no draw.

DATASET: each entry is one controlled hunt with: unit (hunt area), huntNumber, gmu, zone, tags, firstChoiceApplicants, residentApplicants, residentOdds, nonResidentOdds. For a RESIDENT, currentOdds = the hunt's residentOdds.

FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE CONTROLLED HUNTS (real 2025 draw odds):
${JSON.stringify(scoutDataset)}

Score and rank. Minimum 6 recommendations.
- currentOdds MUST equal the hunt's residentOdds from the data — never invent odds.
- NO POINTS: residentQuota = the hunt's tags; residentApplicants = the hunt's residentApplicants.
- Tier by probability (NOT points): residentOdds ≥ 25% → DRAW_NOW; 10–25% → RANDOM_PLAY; < 10% → BUILD_AND_WAIT or LONG_GAME (a low-odds lottery, framed honestly).
- MUST include at least 1 GENERAL-SEASON / OTC option as a guaranteed fallback: poolType "OTC", currentOdds "OTC — no draw required".
- The "unit" field in your output MUST equal the dataset entry's "unit" (hunt area) EXACTLY. Ignore the Wyoming key-format rules below — they do not apply to Idaho.
- topEnd/typicalScore are not in the data; give realistic Idaho estimates and flag they are estimates. Flag any below ${trophyFloor}".

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

${isArchery ? 'NOTE: Archery elk is widely OTC statewide in Colorado — always highlight OTC archery as a guaranteed option.' : ''}
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE HUNT DATA (real CPW choice-1 draw-success rates):
${JSON.stringify(scoutDataset)}

Each entry is a GMU with its hunt codes (huntCodes), resident/non-resident choice-1 draw-success RANGES (resDrawSuccess / nonResDrawSuccess), and the best/easiest rate (bestResSuccess / bestNonResSuccess). Hunt-code trailing letters encode method (R=rifle, A=archery, M=muzzleloader). These are draw-SUCCESS RATES, not exact preference points — CPW does not publish points-to-draw in a usable form.

Score and rank GMU units. Minimum 7 recommendations.
- For a NON-RESIDENT, currentOdds = the unit's nonResDrawSuccess range; cite specific huntCodes. Low success % = high demand (many points); high % = easy / low points.
- Tier by bestNonResSuccess: >=60% → DRAW_NOW; 25–60% → RANDOM_PLAY; <25% → BUILD_AND_WAIT or LONG_GAME.
- NO EXACT POINTS: set nrMinPoints to 0 and do NOT state a specific number of preference points required; say points "vary — confirm current line on CPW".
- MUST include at least 1 OTC option (Colorado has broad OTC archery elk and rifle 2nd/3rd-season elk in many GMUs): poolType "OTC", currentOdds "OTC — no draw required".
- The "unit" field in output = the GMU number from the data. topEnd/typicalScore are not in the data — give realistic estimates and flag any below ${trophyFloor}".

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

${isArchery ? 'NOTE: Archery elk is widely OTC statewide in Colorado — always highlight OTC archery as a guaranteed option.' : ''}
FAMILIARITY: Hunter knows "${knownAreas}". Reference by name in whyItFits.

${sharedHunterProfile(p)}

AVAILABLE HUNT DATA (real CPW choice-1 draw-success rates):
${JSON.stringify(scoutDataset)}

Each entry is a GMU with its hunt codes (huntCodes), resident/non-resident choice-1 draw-success RANGES (resDrawSuccess / nonResDrawSuccess), and the best/easiest rate (bestResSuccess / bestNonResSuccess). Hunt-code trailing letters encode method (R=rifle, A=archery, M=muzzleloader). These are draw-SUCCESS RATES, not exact preference points.

Score and rank GMU units. Minimum 6 recommendations.
- For a RESIDENT, currentOdds = the unit's resDrawSuccess range; cite specific huntCodes. Tier by bestResSuccess. Low success % = high demand (many points); high % = easy / low points.
- NO EXACT POINTS: do NOT state a specific number of preference points required; say points "vary — confirm current line on CPW".
- MUST include at least 1 OTC option (broad OTC archery elk and rifle 2nd/3rd-season elk): poolType "OTC", currentOdds "OTC — no draw required".
- The "unit" field in output = the GMU number from the data. topEnd/typicalScore are not in the data — give realistic estimates and flag any below ${trophyFloor}".

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