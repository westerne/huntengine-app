import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';
import { WYOMING_DEER_UNITS, buildDrawTrendBlock } from './wyodeerdata';
import { WYOMING_ELK_UNITS, buildElkDrawTrendBlock } from './wyoelkdata';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const speciesKeyMap: Record<string, string> = {
  'mule deer': 'DEER', 'muley': 'DEER', 'muleys': 'DEER', 'deer': 'DEER', 'whitetail': 'DEER',
  'elk': 'ELK', 'antelope': 'ANTELOPE', 'pronghorn': 'ANTELOPE',
  'moose': 'MOOSE', 'bighorn sheep': 'BIGHORNSHEEP', 'bighorn': 'BIGHORNSHEEP',
  'sheep': 'BIGHORNSHEEP', 'mountain goat': 'MTNGOAT', 'goat': 'MTNGOAT',
};

const stateAliases: Record<string, string> = {
  'WY': 'WYOMING', 'ID': 'IDAHO', 'MT': 'MONTANA', 'CO': 'COLORADO',
  'UT': 'UTAH', 'NV': 'NEVADA', 'AZ': 'ARIZONA', 'NM': 'NEW MEXICO',
  'OR': 'OREGON', 'WA': 'WASHINGTON',
};

const utahUnitAliases: Record<string, string> = {
  'henry mountains': 'Henry Mountains', 'henry mtns': 'Henry Mountains', 'henrys': 'Henry Mountains', 'henry': 'Henry Mountains', 'henry mtn': 'Henry Mountains',
  'paunsaugunt': 'Paunsaugunt', 'pauns': 'Paunsaugunt', 'paunsaugunt plateau': 'Paunsaugunt', 'bryce': 'Paunsaugunt',
  'book cliffs': 'Book Cliffs', 'book cliffs deer': 'Book Cliffs', 'book': 'Book Cliffs',
  'fillmore': 'Fillmore Oak Creek', 'oak creek': 'Fillmore Oak Creek', 'fillmore oak creek': 'Fillmore Oak Creek', 'fillmore deer': 'Fillmore Oak Creek',
  'san juan': 'San Juan', 'san juan deer': 'San Juan', 'southeast utah deer': 'San Juan',
  'la sal': 'La Sal Dolores Triangle', 'lasal': 'La Sal Dolores Triangle', 'la sal dolores': 'La Sal Dolores Triangle', 'dolores triangle': 'La Sal Dolores Triangle', 'la sal deer': 'La Sal Dolores Triangle', 'moab deer': 'La Sal Dolores Triangle',
  'diamond mountain': 'Diamond Mountain', 'diamond': 'Diamond Mountain', 'diamond mtn': 'Diamond Mountain', 'south slope': 'Diamond Mountain',
  'vernon': 'Vernon', 'west desert deer': 'Vernon', 'vernon deer': 'Vernon',
  'thousand lake': 'Thousand Lake', 'thousand lake mtn': 'Thousand Lake', 'thousand lake mountain': 'Thousand Lake',
  'boulder kaiparowits': 'Boulder Kaiparowits', 'boulder deer': 'Boulder Kaiparowits', 'kaiparowits deer': 'Boulder Kaiparowits', 'grand staircase deer': 'Boulder Kaiparowits',
  'monroe': 'Monroe', 'monroe deer': 'Monroe', 'monroe mountain deer': 'Monroe', 'monroe mountain': 'Monroe',
  'lasal general': 'LaSal General', 'la sal general': 'LaSal General', 'lasal gs': 'LaSal General',
  'san juan elk': 'San Juan', 'southeast utah elk': 'San Juan',
  'fillmore pahvant': 'Fillmore Pahvant', 'pahvant': 'Fillmore Pahvant', 'fillmore elk': 'Fillmore Pahvant', 'pahvant elk': 'Fillmore Pahvant',
  'monroe elk': 'Monroe Elk', 'monroe mountain elk': 'Monroe Elk', 'fishlake elk': 'Monroe Elk',
  'boulder elk': 'Boulder Elk', 'boulder mountain elk': 'Boulder Elk',
  'beaver elk': 'Beaver Elk', 'beaver': 'Beaver Elk', 'beaver unit elk': 'Beaver Elk',
  'southwest desert elk': 'Southwest Desert Elk', 'sw desert elk': 'Southwest Desert Elk', 'southwest desert': 'Southwest Desert Elk', 'sw desert': 'Southwest Desert Elk',
  'panguitch lake elk': 'Panguitch Lake Elk', 'panguitch elk': 'Panguitch Lake Elk', 'panguitch lake': 'Panguitch Lake Elk',
  'manti elk': 'Manti Elk', 'manti': 'Manti Elk', 'manti mountains elk': 'Manti Elk', 'manti la sal elk': 'Manti Elk',
  'mt dutton elk': 'Mt Dutton Elk', 'mount dutton elk': 'Mt Dutton Elk', 'mt dutton': 'Mt Dutton Elk', 'dutton elk': 'Mt Dutton Elk',
  'wasatch elk': 'Wasatch Elk', 'wasatch mountains elk': 'Wasatch Elk', 'wasatch': 'Wasatch Elk',
  'book cliffs elk': 'Book Cliffs Elk',
  'west desert': 'West Desert', 'west desert antelope': 'West Desert', 'utah west desert': 'West Desert',
  'plateau': 'Plateau', 'plateau antelope': 'Plateau', 'fishlake antelope': 'Plateau',
  'panguitch antelope': 'Panguitch Antelope', 'panguitch': 'Panguitch Antelope',
  'north slope uintas': 'North Slope Uintas', 'north slope': 'North Slope Uintas', 'uintas moose': 'North Slope Uintas', 'uinta moose': 'North Slope Uintas', 'north uintas': 'North Slope Uintas',
  'cache moose': 'Cache Moose', 'cache': 'Cache Moose', 'cache valley moose': 'Cache Moose', 'logan moose': 'Cache Moose',
  'uintas east moose': 'Uintas East Moose', 'east uintas moose': 'Uintas East Moose', 'uintas east': 'Uintas East Moose',
  'kaiparowits east': 'Kaiparowits East', 'kaiparowits east sheep': 'Kaiparowits East',
  'kaiparowits west': 'Kaiparowits West', 'kaiparowits west sheep': 'Kaiparowits West',
  'kaiparowits escalante': 'Kaiparowits Escalante', 'escalante sheep': 'Kaiparowits Escalante', 'escalante bighorn': 'Kaiparowits Escalante',
  'san rafael dirty devil': 'San Rafael Dirty Devil', 'san rafael': 'San Rafael Dirty Devil', 'dirty devil': 'San Rafael Dirty Devil', 'san rafael sheep': 'San Rafael Dirty Devil',
  'san rafael south': 'San Rafael South', 'san rafael south sheep': 'San Rafael South',
  'box elder': 'Box Elder Newfoundland RMBS', 'box elder sheep': 'Box Elder Newfoundland RMBS', 'newfoundland': 'Box Elder Newfoundland RMBS', 'box elder newfoundland': 'Box Elder Newfoundland RMBS',
  'fillmore oak creek rmbs': 'Fillmore Oak Creek RMBS', 'fillmore sheep': 'Fillmore Oak Creek RMBS', 'pahvant sheep': 'Fillmore Oak Creek RMBS', 'oak creek sheep': 'Fillmore Oak Creek RMBS',
};

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    console.log("MODE RECEIVED:", mode);
    console.log("STATE:", formData.states, formData.state);

    // 1. SPECIES & STATE RESOLUTION
    const speciesRaw = (formData.species || '').toLowerCase();
    const speciesKey = speciesKeyMap[speciesRaw]
      || Object.entries(speciesKeyMap).find(([k]) => speciesRaw.includes(k))?.[1]
      || speciesRaw.toUpperCase().replace(/\s+/g, '');

    const stateRaw = (formData.state || formData.states?.[0] || '').toUpperCase().trim();
    const stateName = stateAliases[stateRaw] || stateRaw;
    const lookupKey = `${stateName}_${speciesKey}`;

    // 2. FLAGS — declared once, used throughout
    const isWyoming = stateName === 'WYOMING';
    const isDeer = speciesKey === 'DEER';
    const isElk = speciesKey === 'ELK';
    const residencyRaw = (formData.residency || '').toLowerCase().trim();
    const isResident = residencyRaw.includes('resident') || residencyRaw === 'yes' || residencyRaw === 'true';

    // 3. UNIT RESOLUTION
    const unitRaw = (formData.unit || '').toString().trim();
    const unitResolved = stateName === 'UTAH'
      ? (utahUnitAliases[unitRaw.toLowerCase()] || unitRaw)
      : unitRaw;

    // 4. DATA LOOKUP — merge HUNT_DATA and WYOMING_DEER_UNITS
    const stateDataset: Record<string, any> = {
      ...(HUNT_DATA[lookupKey + '_ALL'] || {}),
      ...(HUNT_DATA[lookupKey] || {}),
      ...(isWyoming && isDeer && WYOMING_DEER_UNITS[unitResolved]
        ? { [unitResolved]: WYOMING_DEER_UNITS[unitResolved] }
        : {}),
    };

    const unitKey = Object.keys(stateDataset).find(key =>
      key.toLowerCase() === unitResolved.toLowerCase()
    );
    const unitStats = unitKey ? stateDataset[unitKey] : null;
    const hasData = !!unitStats;
    const fallbackCoords = { lat: 42.6542, lng: -110.8234 };

    // 5. SCOUT MODE
    if (mode === 'SCOUT') {
      const hunterPoints = formData.points?.[stateRaw] ?? formData.points?.['WY'] ?? 0;
      const trophyFloor = parseInt(formData.trophyQuality || '0');
      const timeline = formData.drawTimeline || 'This Year';
      const huntStyle = formData.huntStyles?.join(', ') || 'Any';
      const fitness = formData.fitness || 'Moderate';
      const isResidentScout = isResident;

      // ─── WEAPON / HUNT TYPE DETECTION ───────────────────────────────
      const selectedWeapon = (formData.weapon || '').toLowerCase();
      const selectedHuntStyles = (formData.huntStyles || []).map((s: string) => s.toLowerCase());
      const isArcheryHunter = selectedWeapon.includes('bow')
        || selectedWeapon.includes('archery')
        || selectedHuntStyles.some((s: string) => s.includes('archery'));
      const isMuzzleHunter = selectedWeapon.includes('muzzle');
      const isRifleHunter = !isArcheryHunter && !isMuzzleHunter;

      // Hunt type codes: 9=archery, 1/2/3=rifle or any, 4/5=antlerless (always excluded for trophy scouts)
      const allowedHuntTypeCodes = isArcheryHunter ? ['9'] : isMuzzleHunter ? ['1'] : ['1', '2', '3'];
      const weaponLabel = isArcheryHunter ? 'ARCHERY (Type 9 only)' : isMuzzleHunter ? 'MUZZLELOADER (Type 1)' : 'RIFLE (Types 1, 2, 3)';

      console.log("WYOMING_DEER_UNITS keys:", Object.keys(WYOMING_DEER_UNITS));
      console.log("SAMPLE UNIT:", JSON.stringify(WYOMING_DEER_UNITS['141'], null, 2));

      // ─── SCOUT DATASET ───────────────────────────────────────────────
      const scoutDataset = isWyoming && isDeer
        ? Object.entries(WYOMING_DEER_UNITS).map(([unitName, unit]) => {
            try {
              const history = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
              const latest = history[0] ?? null;
              const prior = history[1] ?? null;
              return {
                unit: unitName,
                typical: unit.typical ?? 'N/A',
                topEnd: unit.topEnd ?? 'N/A',
                trait: unit.trait ?? '',
                description: unit.description ?? '',
                huntType: unit.huntType ?? '',
                seasons: unit.seasons ?? {},
                residentOdds: latest?.resident?.approxOdds ?? 'N/A',
                residentOddsPriorYear: prior?.resident?.approxOdds ?? 'N/A',
                residentQuota: latest?.resident?.quota ?? 'N/A',
                residentApplicants: latest?.resident?.firstChoiceApplicants ?? 'N/A',
                nrRegularMinPoints: latest?.nr_regular?.minPoints ?? 'N/A',
                nrRandomOdds: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOddsPriorYear: prior?.nr_random?.approxOdds ?? 'N/A',
                nrSpecialMinPoints: latest?.nr_special?.minPoints ?? 'N/A',
                dataYear: latest?.year ?? 'N/A',
                priorYear: prior?.year ?? 'N/A',
                nrRandomOdds2025: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOdds2024: prior?.nr_random?.approxOdds ?? 'N/A',
                residentOdds2025: latest?.resident?.approxOdds ?? 'N/A',
                residentOdds2024: prior?.resident?.approxOdds ?? 'N/A',
                nrSpecialRandomOdds: latest?.nr_special_random?.approxOdds ?? 'N/A',
                nrSpecialRandomQuota: latest?.nr_special_random?.quota ?? 'N/A',
                nrSpecialRandomApplicants: latest?.nr_special_random?.firstChoiceApplicants ?? 'N/A',
              };
            } catch (e) {
              console.error(`Error processing unit ${unitName}:`, e);
              return null;
            }
          }).filter(Boolean)

        : isWyoming && isElk
        ? Object.entries(WYOMING_ELK_UNITS).map(([unitName, unit]: [string, any]) => {
            try {
              const history = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
              const latest = history[0] ?? null;
              const prior = history[1] ?? null;

              // Parse hunt type code from key (e.g. '38-9' → '9')
              const huntTypeCode = unitName.includes('-') ? unitName.split('-')[1] : unitName;
              const unitNumber = unitName.includes('-') ? unitName.split('-')[0] : unitName;

              return {
                unit: unitName,
                unitNumber,
                huntTypeCode,                        // '1','2','3','4','5','9','general'
                huntTypeLabel: unit.huntTypeLabel ?? '',
                typical: unit.typical ?? 'N/A',
                topEnd: unit.topEnd ?? 'N/A',
                trait: unit.trait ?? '',
                description: unit.description ?? '',
                tier: unit.tier ?? '',
                seasons: unit.seasons ?? {},
                // Resident fields
                residentOdds: latest?.resident?.approxOdds ?? 'N/A',
                residentOdds2025: latest?.resident?.approxOdds ?? 'N/A',
                residentOdds2024: prior?.resident?.approxOdds ?? 'N/A',
                residentQuota: latest?.resident?.quota ?? 'N/A',
                residentApplicants: latest?.resident?.firstChoiceApplicants ?? 'N/A',
                // NR fields (for NR hunters only — ignore if resident)
                nrRegularMinPoints: latest?.nr_regular?.minPoints ?? 'N/A',
                nrSpecialMinPoints: latest?.nr_special?.minPoints ?? 'N/A',
                nrRandomOdds: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOdds2025: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOdds2024: prior?.nr_random?.approxOdds ?? 'N/A',
                nrSpecialRandomOdds: latest?.nr_special_random?.approxOdds ?? 'N/A',
                nrSpecialRandomQuota: latest?.nr_special_random?.quota ?? 'N/A',
                nrSpecialRandomApplicants: latest?.nr_special_random?.firstChoiceApplicants ?? 'N/A',
                dataYear: latest?.year ?? 'N/A',
                priorYear: prior?.year ?? 'N/A',
              };
            } catch (e) {
              console.error(`Error processing unit ${unitName}:`, e);
              return null;
            }
          })
          // ── FILTER: remove antlerless, filter by weapon type ──────────
          .filter((entry): entry is NonNullable<typeof entry> => {
            if (!entry) return false;
            const code = entry.huntTypeCode;
            // Always exclude antlerless-only tags for trophy elk scout
            if (code === '4' || code === '5') return false;
            // General regions: always include (no type code)
            if (code === 'general') return true;
            // Filter by hunter's weapon
            return allowedHuntTypeCodes.includes(code);
          })

        : Object.entries(stateDataset).map(([unitName, unit]: [string, any]) => ({
            unit: unitName,
            typical: unit.typical ?? 'N/A',
            topEnd: unit.topEnd ?? 'N/A',
            trait: unit.trait ?? '',
            description: unit.description ?? '',
            huntType: unit.huntType ?? '',
            seasons: unit.seasons ?? {},
            residentOdds: unit.residentDrawInfo?.approxOdds ?? 'N/A',
            nrRegularMinPoints: unit.drawInfo?.regular?.minPoints ?? 'N/A',
            nrRandomOdds: unit.drawInfo?.random?.approxOdds ?? 'N/A',
            nrRandomOdds2025: unit.drawInfo?.random?.approxOdds ?? 'N/A',
            nrRandomOdds2024: 'N/A',
            residentOdds2025: unit.residentDrawInfo?.approxOdds ?? 'N/A',
            residentOdds2024: 'N/A',
          }));

      // ─── SCOUT PROMPT ────────────────────────────────────────────────
      const scoutPrompt = `
You are HuntEngine.ai — a western hunting intelligence system built from real field experience across the Rocky Mountain West. You think like a seasoned guide and draw strategist who has hunted these units and helped hundreds of hunters build smart application strategies.

Your job is two things: (1) give this hunter an honest assessment of where they stand in the draw, and (2) recommend the best units with a clear action plan tailored to their exact situation.

HUNTER PROFILE:
- State: ${stateName}
- Species: ${speciesKey}
- Residency: ${formData.residency}
- Points: ${hunterPoints} ${isResidentScout ? '(IRRELEVANT — resident draw is pure random, no points system)' : ''}
- Trophy Floor: ${trophyFloor}" minimum
- Draw Timeline: ${timeline}
- Hunt Style: ${huntStyle}
- Fitness Level: ${fitness}
- Days Available: ${formData.daysToHunt}
- Scouting Availability: ${formData.scoutingAvailability}
- Willing to Sacrifice Trophy for Drawability: ${formData.sacrificeTrophy || 'Not specified'}
- Units / Areas They Already Know: ${formData.knownAreas || 'None provided'}
- Past Experience with This Species: ${formData.pastExperience || 'Not specified'}
- Hunter Context (their own words): ${formData.hunterContext || 'None provided'}
- Notes: ${formData.notes || 'None'}
- Weapon / Hunt Type: ${weaponLabel}

AVAILABLE UNIT DATA (already filtered to ${weaponLabel} — do not recommend any other weapon type):
${JSON.stringify(scoutDataset)}

═══════════════════════════════════════════════════════════
CRITICAL DRAW RULES — READ EVERY LINE BEFORE SCORING
═══════════════════════════════════════════════════════════

${isResidentScout ? `
RESIDENT DRAW RULES (THIS HUNTER IS A RESIDENT — APPLY THESE EXCLUSIVELY):

1. Wyoming residents draw elk on a PURE RANDOM basis. There is NO points system. NO preference pools. NO advantage from having more points.
2. Score every unit ONLY on the "residentOdds" field. This is the ONLY draw metric that matters.
3. NEVER mention points, NR pools, regular pool, special pool, random pool, or NR odds anywhere in your output. That system does not exist for this hunter.
4. NEVER show nrRegularMinPoints, nrRandomOdds, nrSpecialOdds, or any NR field in recommendations.
5. Wyoming resident ELK general tags (Region W, Region E, Region S with huntTypeCode "general") are OVER THE COUNTER — no draw required. Always include the relevant general region as a guaranteed DRAW_NOW option if it fits the hunter's weapon type and style.
6. Resident tier mapping:
   - DRAW_NOW = residentOdds >= 15% (or OTC general tag)
   - BUILD_AND_WAIT = residentOdds 5–14%
   - LONG_GAME = residentOdds < 5%
7. regularPoolUnits in drawReality = count of units where residentOdds >= 15%. randomPoolUnits = 0 always.
8. currentOdds in recommendations = residentOdds value exactly (e.g. "12.58%"). Never show NR odds.
9. drawFeasibility = plain English based on residentOdds (e.g. "Tough — roughly 1 in 8 chance").
10. strategyPath logic for residents:
    - DRAW_NOW if 3+ units have residentOdds >= 15%
    - BUILD_AND_WAIT if best odds are 5-15%
    - LONG_GAME if all target units are under 5%
    - Always note the OTC general tag option as a fallback.

WEAPON / HUNT TYPE FILTER (HARD RULE):
- This hunter selected: ${weaponLabel}
- The dataset has already been filtered. Every entry you see is the correct weapon type.
- DO NOT recommend any unit with a different huntTypeCode.
- huntTypeCode "9" = archery. huntTypeCode "1/2/3" = rifle. huntTypeCode "general" = OTC general region (always matches).
- If the hunter selected archery: ONLY recommend archery-specific units (Type 9) and general regions.
- General regions are always OTC and always available regardless of weapon — include them.

TROPHY FLOOR (HARD RULE):
- Trophy floor is ${trophyFloor}" minimum.
- DO NOT recommend any unit where topEnd does not reach ${trophyFloor}".
- Exception: if fewer than 3 units in the dataset meet the floor, include the closest units and flag the tradeoff explicitly.

HUNT STYLE MATCHING:
- Hunter selected: ${huntStyle}
- Backcountry / bivy / spike = reward remote roadless wilderness terrain. Penalize truck camp / road-accessible units.
- Truck camp / base camp = reward road access and vehicle-friendly terrain.
- High fitness: reward demanding terrain. Low/moderate fitness: penalize extreme elevation gain.
- If hunter mentioned specific units they know (${formData.knownAreas || 'none'}), bump those units +1 in scoring and reference the familiarity in whyItFits.

` : `
NR DRAW RULES (APPLY THESE — THIS HUNTER IS NON-RESIDENT):

- Wyoming has FOUR NR draw pools: Regular (points-based), Special (points-based), Random (zero points required), and Special Random (zero points required)
- A hunter with ${hunterPoints} points CANNOT access the regular pool for any unit where nrRegularMinPoints > ${hunterPoints}
- A hunter with ${hunterPoints} points CANNOT access the special pool for any unit where nrSpecialMinPoints > ${hunterPoints}
- For 0-point hunters, BOTH the random pool (nrRandomOdds) and special random pool (nrSpecialRandomOdds) are accessible — always show combined odds
- combinedRandomOdds = nrRandomOdds + nrSpecialRandomOdds (add the two percentages together for total draw chance)
- currentOdds for 0-point NR hunters = combinedRandomOdds — never show nrRegularOdds or 100%
- currentOdds for hunters who can access the regular pool = nrRegularOdds at their point level
- nrRandomOdds2024 is for trend comparison only — never display as currentOdds
- For elk general regions (E, S, W): always include at least 2-3 with viable combined random odds for 0-point hunters
- regularPoolUnits and randomPoolUnits in drawReality: for NR, regularPoolUnits = units where nrRegularMinPoints <= ${hunterPoints}
`}

═══════════════════════════════════════════════════════════
STEP 1 — ASSESS DRAW REALITY
═══════════════════════════════════════════════════════════

Analyze the full dataset and determine:
${isResidentScout
  ? `- How many units have residentOdds >= 15% (DRAW_NOW tier)
- How many units have residentOdds 5-14% (BUILD_AND_WAIT tier)
- What the best realistic archery unit is based on trophy potential + draw odds combined
- Note that general region (OTC) is always available as a fallback`
  : `- How many units this hunter can draw RIGHT NOW via the regular pool (nrRegularMinPoints <= ${hunterPoints})
- How many units have viable random pool odds (nrRandomOdds > 3%)
- How many points away they are from their best limited unit
- Whether a random pool play makes sense this year regardless of points`}

Based on this, assign ONE of these strategy paths:
- "DRAW_NOW" — hunter can access 1+ good units this year
- "RANDOM_PLAY" — ${isResidentScout ? 'N/A for residents' : 'hunter has 0-low points but viable random pool options exist'}
- "BUILD_AND_WAIT" — best units have 5-15% odds or are 2-4 years out
- "LONG_GAME" — best target units are under 5% odds or 5+ years out

═══════════════════════════════════════════════════════════
STEP 2 — SCORE UNITS
═══════════════════════════════════════════════════════════

Rate each unit 1–10 on four dimensions, rank by total:

1. DRAWABILITY (weight most heavily)
${isResidentScout
  ? `- Based ONLY on residentOdds. OTC general = 10. >= 20% = 8-9. 10-20% = 6-7. 5-10% = 4-5. < 5% = 1-3.`
  : `- NR hunter with ${hunterPoints} points, timeline: "${timeline}"
   - This Year: regular pool accessible = 8-10. Random odds >5% = 6-8. Random odds 1-5% = 4-6. < 1% = 1-3.`}

2. TROPHY MATCH
- Soft filter: topEnd must reach ${trophyFloor}". topEnd 20"+ above floor = 9-10. Just meeting floor = 5-6.
- If hunter will sacrifice trophy for drawability, relax this filter and note the tradeoff.

3. ACCESS & STYLE MATCH
- Hunt style: ${huntStyle}, Fitness: ${fitness}
- Backcountry/bivy/spike: reward remote roadless terrain. Truck camp: reward road access.
- If hunter knows this area (from ${formData.knownAreas || 'none listed'}), bump score +1 point.

4. PRESSURE & OPPORTUNITY
- Lower applicant-to-quota ratio = less pressure = higher score.
${isResidentScout ? `- residentOdds above 15% = higher score. Under 5% = lower score.` : `- Resident odds above 15% = higher score.`}

═══════════════════════════════════════════════════════════
STEP 3 — BUILD THE ACTION PLAN
═══════════════════════════════════════════════════════════

Write a personalized action plan. Be direct and specific — this is advice from a guide who knows the system.

${isResidentScout ? `
RESIDENT ACTION PLAN GUIDANCE:
- Lead with the OTC general region option (Region W for west Wyoming hunters) — it's always available, always worth mentioning as the guaranteed fallback.
- Then rank the limited archery units by residentOdds × trophy potential combined.
- Be honest about odds. If the best archery units are under 5%, say so plainly.
- Mention that applying for multiple units doesn't help residents in the same way it helps NR hunters — each unit is a separate draw entry.
- Tone: direct, realistic, encouraging. This hunter wants a 320"+ bull on the bow in backcountry. Give them a real path.
` : `
DRAW_NOW guidance: Lead with best drawable unit, note how many regular pool options exist, suggest random pool backups.
RANDOM_PLAY guidance: Honest about low odds. Recommend 2-3 best random pool units. Suggest point banking.
BUILD_AND_WAIT guidance: Exact points needed, years out, what to hunt in the meantime.
LONG_GAME guidance: Straight talk, realistic timeline, diversification strategy.
`}

═══════════════════════════════════════════════════════════
OUTPUT — return ONLY valid JSON, exact structure below
═══════════════════════════════════════════════════════════

{
  "drawReality": {
    "regularPoolUnits": number,
    "randomPoolUnits": number,
    "pointsToNextUnit": number,
    "bestLimitedUnit": string,
    "summary": string (2-3 sentences plain English — ${isResidentScout ? 'NO mention of points or NR pools. Resident random draw only.' : 'honest draw assessment'})
  },
  "strategyPath": "DRAW_NOW" | "RANDOM_PLAY" | "BUILD_AND_WAIT" | "LONG_GAME",
  "actionPlan": {
    "headline": string (one punchy line),
    "steps": array of strings (3-5 concrete action steps written directly to this hunter),
    "randomPoolPlays": ${isResidentScout ? 'array of strings (list the OTC general region and any DRAW_NOW tier archery units as guaranteed/high-odds options)' : 'array of strings (unit names worth applying random pool)'},
    "pointBankingAdvice": string (${isResidentScout ? '"N/A — Wyoming residents do not use preference points for elk."' : '1-2 sentences on whether/where to bank points'})
  },

  RECOMMENDATION REQUIREMENTS:
  - Minimum 6 units, maximum 8
  - ${isResidentScout
      ? `MUST include: 1-2 DRAW_NOW tier archery units (residentOdds >= 15% if they exist), Region W/E general OTC as DRAW_NOW, 2-3 BUILD_AND_WAIT tier archery units, 1-2 LONG_GAME trophy units. ALL must be ${weaponLabel} type from the dataset.`
      : `MUST include: 1-2 DRAW_NOW, 2 RANDOM_PLAY general regions, 2 BUILD_AND_WAIT or LONG_GAME trophy units.`}
  - All units MUST have topEnd >= ${trophyFloor}" (or flag explicitly if impossible)
  - Reference hunterContext and knownAreas in whyItFits for relevant units
  - ${isResidentScout ? 'NEVER include NR pool data, points requirements, or NR odds in any recommendation field.' : ''}

  "recommendations": [
    {
      "unit": string,
      "state": string,
      "typicalScore": string,
      "topEnd": string,
      "drawFeasibility": string,
      "currentOdds": string (${isResidentScout ? 'residentOdds value — e.g. "12.58%". NEVER show NR odds.' : 'actual draw odds'}),
      "predictedOdds": string,
      "oddsDirection": "UP" | "DOWN" | "STABLE",
      ${isResidentScout
        ? '"residentOdds": string, "residentQuota": number, "residentApplicants": number,'
        : '"nrMinPoints": number, "nrRandomOdds": string,'}
      "season": string,
      "terrain": string,
      "accessRating": string,
      "pressureRating": string,
      "totalScore": number,
      "tier": "DRAW_NOW" | ${isResidentScout ? '' : '"RANDOM_PLAY" |'} "BUILD_AND_WAIT" | "LONG_GAME",
      "whyItFits": string (3-4 sentences written directly to this hunter — reference their bow hunt, backcountry style, fitness, trophy goal, and any areas they know),
      "tradeoffs": string (1 honest sentence on the real downside for this specific hunter)
    }
  ]
}

FIELD RULES:
- typicalScore: actual inch range string from data (e.g. "320-350\\"")
- topEnd: actual inch string from data (e.g. "380\\"+")
- currentOdds: ${isResidentScout ? 'residentOdds field value exactly. NO NR data.' : 'actual draw odds string'}
- predictedOdds: project based on year-over-year trend if two years of data exist
- season: open/close dates from seasons data
- terrain: 2-4 word description
- tier: assign based on this hunter's actual draw situation
- whyItFits: SPECIFIC to this hunter — bow, backcountry, high fitness, 320"+ goal
- tradeoffs: honest, unit-specific downside
- drawReality.summary: ${isResidentScout ? 'No points talk. Resident random draw only. Plain English.' : 'Plain English assessment.'}
- actionPlan.steps: direct instructions ("Apply for Unit X as your first choice")
- No generic advice. Every field must be specific to this hunter and this data.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: scoutPrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));
    }

    // 6. DRAW SUMMARY
    let drawSummary = "NO OFFICIAL DATA AVAILABLE. Provide general draw advice only.";

    const wyoUnit = isWyoming && isDeer ? WYOMING_DEER_UNITS[unitResolved] : null;
    if (wyoUnit?.drawHistory?.length) {
      const latest = wyoUnit.drawHistory[wyoUnit.drawHistory.length - 1];
      if (isResident) {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW (${latest.year}) ###
          - DRAW TYPE: Pure Random Draw — Wyoming residents do NOT use preference points for deer.
          - RESIDENT QUOTA: ${latest.resident.quota} tags available.
          - FIRST-CHOICE APPLICANTS: ${latest.resident.firstChoiceApplicants}
          - APPROXIMATE ODDS: ${latest.resident.approxOdds ?? 'Unknown'}
          - STRATEGY: No point advantage exists. This is a pure lottery.
          ########################################################
        `;
      } else {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - WYOMING NR DRAW (${latest.year}) ###
          - NR REGULAR POOL: Quota=${latest.nr_regular.quota}, Min Points=${latest.nr_regular.minPoints ?? 'N/A'}, Odds at Min=${latest.nr_regular.oddsAtMin ?? 'N/A'}
          - NR SPECIAL POOL: Quota=${latest.nr_special.quota}, Min Points=${latest.nr_special.minPoints ?? 'N/A'}, Odds at Min=${latest.nr_special.oddsAtMin ?? 'N/A'}
          - NR RANDOM POOL: Quota=${latest.nr_random.quota}, First-Choice Applicants=${latest.nr_random.firstChoiceApplicants}, Odds=${latest.nr_random.approxOdds ?? 'N/A'}
          - NR SPECIAL RANDOM: Quota=${latest.nr_special_random.quota}, Odds=${latest.nr_special_random.approxOdds ?? 'N/A'}
          ${latest.nr_regular.notes ? `- NOTES: ${latest.nr_regular.notes}` : ''}
          ########################################################
        `;
      }

      if (wyoUnit.drawHistory.length >= 2) {
        const trendBlock = buildDrawTrendBlock(wyoUnit, unitResolved, formData.residency || 'non-resident');
        drawSummary += `\n${trendBlock}`;
      }

    } else if (unitStats?.drawInfo) {
      const d = unitStats.drawInfo;
      if (isWyoming && isResident && isDeer) {
        const r = unitStats?.residentDrawInfo;
        drawSummary = r ? `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW ###
          - DRAW TYPE: Pure Random Draw — Wyoming residents do NOT use preference points for deer.
          - RESIDENT QUOTA: ${r.quota} tags available.
          - FIRST-CHOICE APPLICANTS: ${r.firstChoiceApplicants}
          - APPROXIMATE ODDS: ${r.approxOdds ?? 'Unknown'}
          - STRATEGY: No point advantage exists. This is a pure lottery.
          ########################################################
        ` : `
          ### WYOMING RESIDENT DRAW ###
          - DRAW TYPE: Pure Random Draw — no preference points for resident deer.
          ########################################################
        `;
      } else {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - DRAW DATA (WYOMING SYSTEM) ###
          - REGULAR POOL: Minimum ${d.regular?.minPoints ?? 'N/A'} points required.
          - SPECIAL POOL: Minimum ${d.special?.minPoints ?? 'N/A'} points required.
          - RANDOM POOL: ~${d.random?.approxOdds ?? 'N/A'} odds.
          ###########################################
        `;
      }

    } else if (unitStats?.utahDrawInfo) {
      const u = unitStats.utahDrawInfo;
      drawSummary = `
        ### MANDATORY SOURCE OF TRUTH - DRAW DATA (UTAH SYSTEM) ###
        - PERMIT TYPE: ${u.drawType}
        - POINTS TO GUARANTEE (approx): ${u.bonusPointsToGuarantee ?? 'Lottery/Random Only'}
        - NR RANDOM POOL ODDS: ${u.randomOddsNR ?? 'N/A'}
        - ADDITIONAL NOTES: ${u.notes}
        ###########################################
      `;
    }

    // 7. GUARDRAILS & TRUTH BLOCK
    const geoAnchor = unitStats?.description
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${unitStats.description}.`
      : `LOCATION: Analyze ${stateName} Unit ${unitResolved}.`;

    const trophyInstruction = hasData
      ? `PRIMARY TRUTH DATA: Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}.`
      : `EXPERT MODE: Provide realistic trophy ranges for ${stateName} Unit ${unitResolved}.`;

    const geographicGuardrails = `
      ${geoAnchor}
      ${trophyInstruction}
      ${drawSummary}
      USER STATUS: ${formData.residency}
      MANDATORY COMPLIANCE:
      1. NO MARKDOWN: section titles ALL CAPS. No asterisks. No hashtags.
      2. TRUTH ADHERENCE: You MUST use the exact numbers provided in the DATA blocks.
    `;

    // 8. BRIEF PROMPT — Call 1
    const briefPrompt = `
${geographicGuardrails}

You are a master western hunting guide with decades of boots-on-ground experience. A hunter has drawn a tag for ${stateName} Unit ${unitResolved} and is counting on you for the real intel — not a generic overview.

Write like a guide briefing a client the night before a hunt. Be direct, specific, and honest. If a unit has weaknesses, say so. If the draw odds are brutal, say so. Use plain language, not brochure language.

Generate a JSON object with a single key "brief" containing these sections. Headers in ALL CAPS. Plain text only. No asterisks, hashtags, or markdown.

REQUIRED SECTIONS:

1. UNIT OVERVIEW
What makes this unit unique. Where it sits geographically. What kind of country it is. What kind of hunter it rewards. 3-4 sentences — be specific to this unit, not a generic state overview.

2. DRAW ODDS & RESIDENCY
Use ONLY the numbers from the data block above. Explain the draw system clearly — pools, points required, random pool odds, year-over-year trend. Tell the hunter exactly what their odds are and why. If resident: explain the random draw system. If NR: explain all three pools and what points are needed for each.

3. POPULATION AUDIT
Honest assessment of deer/elk/antelope numbers in this unit. Population trend if known. What's driving density — habitat, predator pressure, winter kill, hunting pressure. Don't sugarcoat a struggling herd.

4. TROPHY AUDIT
Realistic expectations. Use the typical and top-end data provided. What does a good buck/bull here actually look like. What age class is huntable. What percentage of tags fill on mature animals.

5. SUCCESSFUL STYLES
What hunt styles consistently produce in this unit. Be specific — truck camp with spot-and-stalk, backpack into the roadless core, horseback into upper drainages. What does NOT work here and why.

6. TERRAIN & ACCESS
Specific terrain description. Elevation range. Road system. Trailheads. Private land patchwork if relevant. Where the public land pressure concentrates and where it doesn't.

7. HERD BEHAVIOR
How animals use this unit through the season. Early season vs late. Rut timing if relevant. Where they are in September vs October vs November. What changes their patterns — weather, pressure, feed sources.

8. SURVIVAL & LOGISTICS
Nearest town. Cell service reality. Water sources on the mountain. Weather windows. What can go wrong and how to be ready for it. 1 paragraph, practical and direct.
`;

    const briefResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: briefPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const briefParsed = JSON.parse(briefResponse.choices[0].message.content || "{}");

    // 9. TACTICAL + GEAR PROMPT — Call 2
    const unitContext = unitStats ? `
UNIT INTELLIGENCE — USE THIS DATA TO DRIVE EVERY RECOMMENDATION:
- Unit: ${stateName} ${unitResolved}
- Species: ${formData.species}
- Location: ${unitStats.description}
- Terrain Trait: ${unitStats.trait}
- Typical Mature: ${unitStats.typical}
- Top End: ${unitStats.topEnd}
- Hunt Type: ${unitStats.huntType ?? 'N/A'}
- Archery Season: ${unitStats.seasons?.archery?.open ?? 'N/A'} - ${unitStats.seasons?.archery?.close ?? 'N/A'}
- Rifle Season: ${unitStats.seasons?.rifle?.open ?? 'N/A'} - ${unitStats.seasons?.rifle?.close ?? 'N/A'}
` : `
UNIT: ${stateName} ${unitResolved}
Species: ${formData.species}
No structured data available — use expert knowledge for this specific unit.
`;

    console.log("UNIT CONTEXT BEING SENT:", unitContext);
    console.log("UNIT STATS:", JSON.stringify(unitStats));

    const tacticalPrompt = `
You are a master western hunting guide building a personalized tactical hunt plan and gear list. You have hunted this unit. You know this terrain. Everything you write is specific to this unit, this hunter, and this season.

${unitContext}

HUNTER PROFILE:
- Weapon: ${formData.weapon || 'Any'} — effective range: ${formData.weaponRange || 'not specified'}
- Hunt Style: ${formData.huntStyles?.join('/') || 'Backcountry'}
- Fitness: ${formData.fitness || 'Moderate'}
- Experience in Unit: ${formData.experienceInUnit || 'First time'}
- Hunting Party: ${formData.huntingParty || 'Solo'}
- Days Hunting: ${formData.daysToHunt || 5}
- Scouting Available: ${formData.scoutingAvailability || 'None'}
- Preferred Outcome: ${formData.preferredOutcome || 'Mature animal'}
- Budget: ${formData.budget || 'Not specified'}
- Guided or DIY: ${formData.guidedOrDIY || 'DIY'}
- Notes: ${formData.notes || 'None'}

BRIEF ALREADY GENERATED (use as context — do not repeat it):
${JSON.stringify(briefParsed.brief)}

TACTICAL RULES:
- If scouting days are available, open with a SCOUTING OVERVIEW section before Day 1 — where specifically to glass in this unit based on its terrain, what to look for, how to prioritize your time
- Every day's plan must reference the specific terrain described in the unit data — not generic hunting advice
- Desert/sage country: long glassing sessions at first light, water source strategy, heat management mid-day, vehicle access patterns
- Alpine/timber: elevation approach, thermal management, timber edges, transition zones
- Canyon/rimrock: wind reading, shadow hunting, bedding ledge locations
- Adjust approach distances and shooting setup based on weapon type and effective range
- Solo vs partner: adjust strategy accordingly — solo hunters need conservative shot placement, partners can run drives or split terrain
- First-time in unit: include more emphasis on orientation, learning the terrain, identifying key features from maps vs reality
- Returning hunter: assume terrain familiarity, focus on adjustments based on conditions and pressure
- If any field is blank or unknown, make a reasonable assumption based on the unit and species — never leave a section empty

GEAR RULES:
- Every gear recommendation must be justified by this specific unit's terrain, elevation, and conditions
- Do not list generic gear — explain why each item matters for Unit ${unitResolved}
- Always recommend a MTN HNTR Tripod for glassing and shooting support
- Desert terrain: water storage (volume specific), sun protection, long-range optics, heat mirage management
- Alpine terrain: layering system, traction devices, weight reduction, weather protection
- Canyon terrain: quiet footwear, wind indicator, compact optics
- Budget context: ${formData.budget || 'not specified'} — if budget is tight, flag where to prioritize vs where to save
- Guided vs DIY: if DIY, emphasize navigation, self-rescue, and communication tools

Generate a JSON object with exactly two keys:

"tactical": A day-by-day hunt plan. If scouting days are available, include a scouting overview first. Each entry has a "title" and "plan" field. Write the plan field like a guide talking to their client — direct, specific, and honest about what to expect each day.

"gear": Gear organized by category. Each category has a "category" and "items" array. Each item has "item" and "reason" fields. The reason must reference this specific unit — not a generic justification.

Headers in ALL CAPS. Plain text only. No markdown symbols.
`;

    const tacticalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: tacticalPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const tacticalParsed = JSON.parse(tacticalResponse.choices[0].message.content || "{}");

    return NextResponse.json({
      brief: briefParsed.brief,
      tactical: tacticalParsed.tactical,
      gear: tacticalParsed.gear,
      coords: unitStats?.coords || fallbackCoords,
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({
      error: "Engine failure during analysis generation.",
      details: error.message,
    }, { status: 500 });
  }
}