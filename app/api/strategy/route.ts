import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';

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

    // 1. DATA LOOKUP
    const speciesRaw = formData.species?.toLowerCase() || '';
    const speciesKey = speciesKeyMap[speciesRaw]
      || Object.entries(speciesKeyMap).find(([k]) => speciesRaw.includes(k))?.[1]
      || formData.species?.toUpperCase().replace(/\s+/g, '')
      || '';

    const stateRaw = formData.state?.toUpperCase().trim() || '';
    const state = stateAliases[stateRaw] || stateRaw;
    const lookupKey = `${state}_${speciesKey}`;
    const unit = formData.unit?.trim() || '';

    const unitResolved = state === 'UTAH'
      ? (utahUnitAliases[unit.toLowerCase()] || unit)
      : unit;

    const stateDataset: Record<string, any> = {
      ...(HUNT_DATA[lookupKey + '_ALL'] || {}),
      ...(HUNT_DATA[lookupKey] || {}),
    };

    const unitKey = Object.keys(stateDataset).find(key =>
      key.toLowerCase() === unitResolved.toLowerCase()
    );
    const unitStats = unitKey ? stateDataset[unitKey] : null;
    const hasData = !!unitStats;
    const fallbackCoords = { lat: 42.6542, lng: -110.8234 };

    // 2. RESIDENCY & SPECIES FLAGS
    const residencyRaw = formData.residency?.toLowerCase()?.trim() || '';
    const isResident = residencyRaw.includes('resident') || residencyRaw === 'yes' || residencyRaw === 'true';
    const isWyoming = state === 'WYOMING';
    const isDeer = speciesKey === 'DEER';

    // 3. CONSOLIDATED DRAW SUMMARY
    let drawSummary = "NO OFFICIAL DATA AVAILABLE. Provide general draw advice only.";

    if (unitStats?.drawInfo) {
      const d = unitStats.drawInfo;
      if (isWyoming && isResident && isDeer) {
        const r = unitStats?.residentDrawInfo;
        drawSummary = r ? `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW ###
          - RESIDENCY STATUS: Wyoming Resident.
          - DRAW TYPE: Pure Random Draw — Wyoming residents do NOT use preference points for deer.
          - RESIDENT QUOTA: ${r.quota} tags available.
          - FIRST-CHOICE APPLICANTS: ${r.firstChoiceApplicants}
          - APPROXIMATE ODDS: ${r.approxOdds ?? 'Unknown'}
          ${r.notes ? `- NOTES: ${r.notes}` : ''}
          - STRATEGY: No point advantage exists. This is a pure lottery.
          ########################################################
        ` : `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW ###
          - RESIDENCY STATUS: Wyoming Resident.
          - DRAW TYPE: Pure Random Draw — no preference points for resident deer.
          - STRATEGY: Residents draw via random lottery.
          ########################################################
        `;
      } else {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - DRAW DATA (WYOMING SYSTEM) ###
          - REGULAR POOL: Minimum ${d.regular?.minPoints ?? 'N/A'} points required.
          - SPECIAL POOL: Minimum ${d.special?.minPoints ?? 'N/A'} points required.
          - RANDOM POOL: ~${d.random?.approxOdds ?? 'N/A'} odds.
          - LOGISTICS: ${d.regular?.notes || "Refer to Game and Fish for current estimates."}
          ###########################################
        `;
      }
    } else if (unitStats?.utahDrawInfo) {
      const u = unitStats.utahDrawInfo;
      const drawTypeLabel: Record<string, string> = {
        'limited-entry': 'LIMITED ENTRY (LE)',
        'premium-limited-entry': 'PREMIUM LIMITED ENTRY',
        'once-in-a-lifetime': 'ONCE-IN-A-LIFETIME (OIL)',
        'general-season': 'GENERAL SEASON',
      };
      const pointLabel = u.pointSystem === 'bonus'
        ? 'HYBRID BONUS POINT DRAW (50% top points / 50% weighted random)'
        : 'PREFERENCE POINT DRAW (highest points draw first)';

      drawSummary = `
        ### MANDATORY SOURCE OF TRUTH - DRAW DATA (UTAH SYSTEM) ###
        - PERMIT TYPE: ${drawTypeLabel[u.drawType] || u.drawType}
        - DRAW SYSTEM: ${pointLabel}
        - NON-RESIDENT ALLOCATION: ${u.nrAllocation}
        - APPROX NR TAGS ISSUED: ${u.nrTagsApprox ?? 'Unknown'}
        - POINTS TO GUARANTEE (approx): ${u.bonusPointsToGuarantee ?? 'Cannot guarantee — lottery/random only'}
        - NR RANDOM POOL ODDS: ${u.randomOddsNR ?? 'N/A'}
        - WAITING PERIOD: ${u.waitingPeriod}
        - ADDITIONAL NOTES: ${u.notes}
        ###########################################
      `;
    }

    // 4. PROMPT CONSTRUCTION
    const geoAnchor = unitStats?.description
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${unitStats.description}.`
      : `LOCATION: Analyze ${state} Unit ${unit}. EXPERT MODE.`;

    const trophyInstruction = hasData
      ? `PRIMARY TRUTH DATA: Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}.`
      : `EXPERT MODE: Provide realistic trophy ranges for ${state} Unit ${unit}.`;

    const wyDrawPoints = unitStats?.drawInfo?.regular?.minPoints;
    const utDrawPoints = unitStats?.utahDrawInfo?.bonusPointsToGuarantee;
    
    const inlineDrawRef = (isWyoming && isResident && isDeer)
      ? "Pure random draw (No preference points used for resident deer)"
      : wyDrawPoints != null
        ? `${wyDrawPoints} points minimum (regular pool)`
        : unitStats?.utahDrawInfo
          ? `Utah ${unitStats.utahDrawInfo.drawType} tag — random odds ${unitStats.utahDrawInfo.randomOddsNR ?? 'unknown'}`
          : "consult state wildlife agency";

    const geographicGuardrails = `
      ${geoAnchor}
      ${trophyInstruction}
      ${drawSummary}
      USER STATUS: ${formData.residency}
      MANDATORY COMPLIANCE:
      1. NO MARKDOWN: section titles ALL CAPS. No asterisks. No hashtags.
      2. TRUTH ADHERENCE: You MUST use the exact numbers provided in the DRAW DATA block.
    `;

    let systemPrompt = "";
    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        Generate a STRATEGIC BRIEF for ${formData.species} in ${state} Unit ${unit}.
        SECTIONS: 1. UNIT OVERVIEW, 2. DRAW ODDS & RESIDENCY, 3. POPULATION AUDIT, 4. TROPHY AUDIT, 5. SUCCESSFUL STYLES, 6. TERRAIN & ACCESS, 7. HERD BEHAVIOR, 8. SURVIVAL & LOGISTICS.
        MANDATORY:
        - In SECTION 2, use this data: ${inlineDrawRef}.
        - In Section 4, state the Top-End potential: ${unitStats?.topEnd ?? 'N/A'}.
      `;
    } else {
      systemPrompt = `${geographicGuardrails}\nTACTICAL DEEP DIVE. Context: ${context}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0,
    });

    return NextResponse.json({
      strategy: response.choices[0].message.content,
      coords: unitStats?.coords || fallbackCoords,
      label: `${state} ${unitResolved}`,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ strategy: "Uplink Failed.", coords: null }, { status: 500 });
  }
}