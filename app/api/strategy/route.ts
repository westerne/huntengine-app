import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';
import { WYOMING_DEER_UNITS, buildDrawTrendBlock } from './wyodeerdata';

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
      const isResidentScout = (formData.residency || '').toLowerCase().includes('resident');
console.log("WYOMING_DEER_UNITS keys:", Object.keys(WYOMING_DEER_UNITS));
console.log("SAMPLE UNIT:", JSON.stringify(WYOMING_DEER_UNITS['141'], null, 2));
      // Build rich flat dataset from WYOMING_DEER_UNITS for SCOUT mode
    const scoutDataset = isWyoming && isDeer
  ? Object.entries(WYOMING_DEER_UNITS).map(([unitName, unit]) => {
      try {
        const history = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
const latest = history[0] ?? null;   // highest year = most recent
const prior = history[1] ?? null;    // second highest year
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
        };
      } catch (e) {
        console.error(`Error processing unit ${unitName}:`, e);
        return null;
      }
    }).filter(Boolean)
  : Object.entries(stateDataset).map(([unitName, unit]: [string, any]) => ({
      unit: unitName,
      typical: unit.typical,
      topEnd: unit.topEnd,
      trait: unit.trait,
      description: unit.description,
    }));
      const scoutPrompt = `
CRITICAL INSTRUCTION FOR NON-RESIDENT HUNTERS WITH 0 POINTS:
When the hunter has 0 preference points and timeline is "This Year", you MUST include at least 2-3 general regions in your recommendations. General regions (G, H, W, R, K, L, X, B, C, Y, D, F, A, J, M, Q, T) all have NR random pools that require ZERO points to enter. Use nrRandomOdds as their draw odds. Do not exclude regions just because their nrRegularMinPoints is high — the random pool has no point requirement.You are HuntEngine.ai — a western hunting intelligence system. Your job is to find the BEST matching units for this hunter from the data provided.

HUNTER PROFILE:
- State: ${stateName}
- Species: ${speciesKey}
- Residency: ${formData.residency}
- Points: ${hunterPoints}
- Trophy Floor: ${trophyFloor}" minimum — ONLY recommend units where topEnd exceeds this
- Draw Timeline: ${timeline}
- Hunt Style: ${huntStyle}
- Fitness Level: ${fitness}
- Days Available: ${formData.daysToHunt}
- Scouting Availability: ${formData.scoutingAvailability}
- Notes: ${formData.notes || 'None'}

AVAILABLE UNIT DATA:
${JSON.stringify(scoutDataset)}

SCORING INSTRUCTIONS:
Score each unit on these four dimensions (1-10 each) then rank by total:

1. DRAWABILITY (most important)
   ${isResidentScout ?
     '- Resident: Pure random draw. Score based on residentOdds. Above 20% = score 8-10. Under 5% = score 1-3. Under 2% = score 1.' :
     `- Non-Resident with ${hunterPoints} points.
     - Timeline is "${timeline}".
     - IMPORTANT: Wyoming has THREE NR draw pools. A unit is drawable even with 0 points via the random pool.
     - If "This Year":
       - Units where nrRegularMinPoints <= ${hunterPoints}: score 8-10 (drawable via regular pool)
       - Units where nrRandomOdds > 5%: score 6-8 (drawable via random pool regardless of points)
       - Units where nrRandomOdds > 1%: score 4-6 (low but real random pool chance)
       - Units where nrRandomOdds < 1% or null: score 1-3 (very unlikely this year)
     - If "1-3 Years": units within 3 points of nrRegularMinPoints score 6-8. Also include random pool units above 3%.
     - If "Long-Term": all units eligible, weight trophy quality more than drawability.
     - ALWAYS include the best matching general regions (G, H, W, R, K, L, X etc) — these all have random pools drawable at 0 points.
     - For currentOdds field: use nrRandomOdds as the primary odds figure for 0-point hunters since that applies regardless of points held.`
   }
   CRITICAL DRAW ODDS RULES:
- nrRandomOdds is the ONLY valid odds field for a hunter with ${hunterPoints} points
- nrRegularMinPoints tells you the MINIMUM points needed for the regular pool — if the hunter has fewer points than this, the regular pool is NOT available to them
- For Region G: nrRegularMinPoints=10, hunter has ${hunterPoints} points — regular pool NOT available. nrRandomOdds=3.24% — this is their actual draw chance
- NEVER state a hunter can draw at 100% unless nrRandomOdds is literally 100%
- currentOdds must always equal nrRandomOdds for hunters who cannot access the regular pool


2. TROPHY MATCH
   - Hard filter: SKIP any unit where topEnd does not exceed ${trophyFloor}".
   - Units with topEnd 20"+ above floor score 9-10.
   - Units just meeting the floor score 5-6.

3. ACCESS & STYLE MATCH
   - Hunt style: ${huntStyle}
   - Backcountry/Backpack: reward remote, roadless, steep terrain. Penalize accessible truck camp units.
   - Truck Camp: reward road access and accessibility.
   - Horseback: reward large alpine units.
   - Fitness ${fitness}: ${fitness === 'High' || fitness === 'Elite' ? 'reward the most demanding terrain' : 'penalize extreme terrain'}

4. PRESSURE & OPPORTUNITY
   - Lower applicants relative to quota = less pressure = higher score.
   - Resident odds above 15% score higher. Under 3% score lower.

DRAW PREDICTION RULES:
- For NR hunters with fewer points than nrRegularMinPoints, the ONLY valid current odds is nrRandomOdds
- NEVER show nrRegularOdds or any 100% figure as currentOdds for a hunter who cannot access the regular pool
- A hunter with ${hunterPoints} points CANNOT access the regular pool for any unit where nrRegularMinPoints > ${hunterPoints}
- currentOdds must equal nrRandomOdds for these hunters — not 100%, not nrRegularOdds
- Region G currentOdds = 3.24% (nrRandomOdds), NOT 100%
- Region H currentOdds = 7.14% (nrRandomOdds), NOT 100%  
- Region W currentOdds = 32.66% (nrRandomOdds), NOT 100%
- currentOdds must equal nrRandomOdds2025 — the most recent year's actual draw odds
- nrRandomOdds2024 is for trend comparison only — never display it as currentOdds
- For NR hunters with fewer points than nrRegularMinPoints, the ONLY valid current odds is nrRandomOdds2025
...

FOR PREDICTIONS:
- Compare nrRandomOdds (current year) vs nrRandomOddsPriorYear (prior year)
- If nrRandomOdds DECREASED from prior year, oddsDirection = "DOWN" and arrow shows ↓
- If nrRandomOdds INCREASED from prior year, oddsDirection = "UP" and arrow shows ↑
- predictedOdds should project the SAME direction and magnitude of change
- Region G: 4.28% → 3.24% = DOWN trend, predict ~2.3-2.5%, oddsDirection = "DOWN"
- Region H: 9.77% → 7.14% = DOWN trend, predict ~5.5-6.0%, oddsDirection = "DOWN"
- Region W: 84.47% → 32.66% = DOWN trend, predict ~15-20%, oddsDirection = "DOWN"
- Unit 89 resident: 8.88% → check nrRandomOddsPriorYear to confirm direction before labeling UP or DOWN

MANDATORY OUTPUT RULES:
- Return ONLY valid JSON with key "recommendations"
- Return 5-8 units ranked best to worst
- SKIP any unit where topEnd does not meet the trophy floor of ${trophyFloor}"
- Each unit must include these exact fields:
  unit, state, typicalScore, topEnd, drawFeasibility,
  currentOdds, predictedOdds, oddsDirection,
  ${isResidentScout ? 'residentOdds, residentQuota, residentApplicants,' : 'nrMinPoints, nrRandomOdds,'}
  season, terrain, accessRating, pressureRating, totalScore,
  whyItFits, tradeoffs
- topEnd: the actual inch measurement string from the data (e.g. '210"+') — NOT a numeric score
- typicalScore: the actual typical inch range string (e.g. '175-190"') — NOT a numeric score
- season: show open/close dates from seasons data (e.g. "Oct 1-31")
- terrain: 2-4 word description from the unit description field
- currentOdds: the actual 2025 draw odds as a string (e.g. "4.46%")
- predictedOdds: predicted 2026 odds based on trend (e.g. "4.2%" or "3.8-4.5%")
- oddsDirection: "UP" if odds improving, "DOWN" if declining, "STABLE" if flat
- whyItFits: 2-3 sentences specific to THIS hunter — reference their points, style, fitness, trophy goal
- tradeoffs: 1 honest sentence on the downside
- No generic advice. Reference actual data from the unit records.
- state: always "${stateName}"
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

    // 8. SUITE PROMPT
    const suitePrompt = `
      ${geographicGuardrails}
      
      You are a master hunting guide. Generate a 3-part JSON object:
      
      1. "brief": A detailed STRATEGIC BRIEF for ${formData.species}.
         REQUIRED SECTIONS: 1. UNIT OVERVIEW, 2. DRAW ODDS & RESIDENCY, 3. POPULATION AUDIT, 4. TROPHY AUDIT, 5. SUCCESSFUL STYLES, 6. TERRAIN & ACCESS, 7. HERD BEHAVIOR, 8. SURVIVAL & LOGISTICS.
         
      2. "tactical": A day-by-day TACTICAL PLAN for the number of days specified in the timeline.
         If scouting days are mentioned, include a short overview on scouting tactics before the day-by-day plan.
         Include specific movement strategies based on: ${formData.weapon || 'Any Weapon'} and ${formData.huntStyles?.join('/') || 'Backcountry'}.
         
      3. "gear": A specific gear audit for this unit's terrain. On every gear list recommend a MTN HNTR Tripod. 
      Format: Headers in ALL CAPS. Use plain text values. NO MARKDOWN symbols.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: suitePrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      ...parsed,
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
