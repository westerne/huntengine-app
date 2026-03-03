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

// Utah unit alias map — maps any reasonable user input to the exact data.ts key
// Keys are lowercase for case-insensitive matching
const utahUnitAliases: Record<string, string> = {
  // ── DEER ──────────────────────────────────────────────────────────────────
  'henry mountains':          'Henry Mountains',
  'henry mtns':               'Henry Mountains',
  'henrys':                   'Henry Mountains',
  'henry':                    'Henry Mountains',
  'henry mtn':                'Henry Mountains',

  'paunsaugunt':              'Paunsaugunt',
  'pauns':                    'Paunsaugunt',
  'paunsaugunt plateau':      'Paunsaugunt',
  'bryce':                    'Paunsaugunt',

  'book cliffs':              'Book Cliffs',
  'book cliffs deer':         'Book Cliffs',
  'book':                     'Book Cliffs',

  'fillmore':                 'Fillmore Oak Creek',
  'oak creek':                'Fillmore Oak Creek',
  'fillmore oak creek':       'Fillmore Oak Creek',
  'fillmore deer':            'Fillmore Oak Creek',

  'san juan':                 'San Juan',
  'san juan deer':            'San Juan',
  'southeast utah deer':      'San Juan',

  'la sal':                   'La Sal Dolores Triangle',
  'lasal':                    'La Sal Dolores Triangle',
  'la sal dolores':           'La Sal Dolores Triangle',
  'dolores triangle':         'La Sal Dolores Triangle',
  'la sal deer':              'La Sal Dolores Triangle',
  'moab deer':                'La Sal Dolores Triangle',

  'diamond mountain':         'Diamond Mountain',
  'diamond':                  'Diamond Mountain',
  'diamond mtn':              'Diamond Mountain',
  'south slope':              'Diamond Mountain',

  'vernon':                   'Vernon',
  'west desert deer':         'Vernon',
  'vernon deer':              'Vernon',

  'thousand lake':            'Thousand Lake',
  'thousand lake mtn':        'Thousand Lake',
  'thousand lake mountain':   'Thousand Lake',

  'boulder kaiparowits':      'Boulder Kaiparowits',
  'boulder deer':             'Boulder Kaiparowits',
  'kaiparowits deer':         'Boulder Kaiparowits',
  'grand staircase deer':     'Boulder Kaiparowits',

  'monroe':                   'Monroe',
  'monroe deer':              'Monroe',
  'monroe mountain deer':     'Monroe',
  'monroe mountain':          'Monroe',

  'lasal general':            'LaSal General',
  'la sal general':           'LaSal General',
  'lasal gs':                 'LaSal General',

  // ── ELK ───────────────────────────────────────────────────────────────────
  'san juan elk':             'San Juan',
  'southeast utah elk':       'San Juan',

  'fillmore pahvant':         'Fillmore Pahvant',
  'pahvant':                  'Fillmore Pahvant',
  'fillmore elk':             'Fillmore Pahvant',
  'pahvant elk':              'Fillmore Pahvant',

  'monroe elk':               'Monroe Elk',
  'monroe mountain elk':      'Monroe Elk',
  'fishlake elk':             'Monroe Elk',

  'boulder elk':              'Boulder Elk',
  'boulder mountain elk':     'Boulder Elk',

  'beaver elk':               'Beaver Elk',
  'beaver':                   'Beaver Elk',
  'beaver unit elk':          'Beaver Elk',

  'southwest desert elk':     'Southwest Desert Elk',
  'sw desert elk':            'Southwest Desert Elk',
  'southwest desert':         'Southwest Desert Elk',
  'sw desert':                'Southwest Desert Elk',

  'panguitch lake elk':       'Panguitch Lake Elk',
  'panguitch elk':            'Panguitch Lake Elk',
  'panguitch lake':           'Panguitch Lake Elk',

  'manti elk':                'Manti Elk',
  'manti':                    'Manti Elk',
  'manti mountains elk':      'Manti Elk',
  'manti la sal elk':         'Manti Elk',

  'mt dutton elk':            'Mt Dutton Elk',
  'mount dutton elk':         'Mt Dutton Elk',
  'mt dutton':                'Mt Dutton Elk',
  'dutton elk':               'Mt Dutton Elk',

  'wasatch elk':              'Wasatch Elk',
  'wasatch mountains elk':    'Wasatch Elk',
  'wasatch':                  'Wasatch Elk',

  'book cliffs elk':          'Book Cliffs Elk',

  // ── ANTELOPE ──────────────────────────────────────────────────────────────
  'west desert':              'West Desert',
  'west desert antelope':     'West Desert',
  'utah west desert':         'West Desert',

  'plateau':                  'Plateau',
  'plateau antelope':         'Plateau',
  'fishlake antelope':        'Plateau',

  'panguitch antelope':       'Panguitch Antelope',
  'panguitch':                'Panguitch Antelope',

  // ── MOOSE ─────────────────────────────────────────────────────────────────
  'north slope uintas':       'North Slope Uintas',
  'north slope':              'North Slope Uintas',
  'uintas moose':             'North Slope Uintas',
  'uinta moose':              'North Slope Uintas',
  'north uintas':             'North Slope Uintas',

  'cache moose':              'Cache Moose',
  'cache':                    'Cache Moose',
  'cache valley moose':       'Cache Moose',
  'logan moose':              'Cache Moose',

  'uintas east moose':        'Uintas East Moose',
  'east uintas moose':        'Uintas East Moose',
  'uintas east':              'Uintas East Moose',

  // ── DESERT BIGHORN ────────────────────────────────────────────────────────
  'kaiparowits east':         'Kaiparowits East',
  'kaiparowits east sheep':   'Kaiparowits East',

  'kaiparowits west':         'Kaiparowits West',
  'kaiparowits west sheep':   'Kaiparowits West',

  'kaiparowits escalante':    'Kaiparowits Escalante',
  'escalante sheep':          'Kaiparowits Escalante',
  'escalante bighorn':        'Kaiparowits Escalante',

  'san rafael dirty devil':   'San Rafael Dirty Devil',
  'san rafael':               'San Rafael Dirty Devil',
  'dirty devil':              'San Rafael Dirty Devil',
  'san rafael sheep':         'San Rafael Dirty Devil',

  'san rafael south':         'San Rafael South',
  'san rafael south sheep':   'San Rafael South',

  // ── ROCKY MOUNTAIN BIGHORN ────────────────────────────────────────────────
  'box elder':                'Box Elder Newfoundland RMBS',
  'box elder sheep':          'Box Elder Newfoundland RMBS',
  'newfoundland':             'Box Elder Newfoundland RMBS',
  'box elder newfoundland':   'Box Elder Newfoundland RMBS',

  'fillmore oak creek rmbs':  'Fillmore Oak Creek RMBS',
  'fillmore sheep':           'Fillmore Oak Creek RMBS',
  'pahvant sheep':            'Fillmore Oak Creek RMBS',
  'oak creek sheep':          'Fillmore Oak Creek RMBS',
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

    // Resolve Utah unit aliases before lookup
    const unitResolved = state === 'UTAH'
      ? (utahUnitAliases[unit.toLowerCase()] || unit)
      : unit;

    // Merge all-units and top-tier datasets so top-tier entries take priority
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

    // 2. CONSOLIDATED DRAW SUMMARY
    let drawSummary = "";

    if (unitStats?.drawInfo) {
      // Wyoming-style: 3-pool preference point system
      const d = unitStats.drawInfo;
      drawSummary = `
        ### MANDATORY SOURCE OF TRUTH - DRAW DATA (WYOMING SYSTEM) ###
        INSTRUCTIONS: State the lowest point requirement from the Regular and Special categories. Advise hunters to refer to Game and Fish for current estimates.
        The following numbers are the ONLY correct values for this unit:
        - REGULAR POOL: Minimum ${d.regular?.minPoints ?? 'N/A'} points required.
        - SPECIAL POOL: Minimum ${d.special?.minPoints ?? 'N/A'} points required.
        - RANDOM POOL: ~${d.random?.approxOdds ?? 'N/A'} odds.
        - LOGISTICS: ${d.regular?.notes || "Consult current regulations."}
        ###########################################
      `;
    } else if (unitStats?.utahDrawInfo) {
      // Utah-style: hybrid bonus point system (LE) or preference point (general)
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
        INSTRUCTIONS: Explain Utah's draw system accurately. Advise hunters to verify with UDWR for current season data.
        The following data is the ONLY correct information for this unit:
        - PERMIT TYPE: ${drawTypeLabel[u.drawType] || u.drawType}
        - DRAW SYSTEM: ${pointLabel}
        - NON-RESIDENT ALLOCATION: ${u.nrAllocation}
        - APPROX NR TAGS ISSUED: ${u.nrTagsApprox ?? 'Unknown'}
        - POINTS TO GUARANTEE (approx): ${u.bonusPointsToGuarantee ?? 'Cannot guarantee — lottery/random only'}
        - NR RANDOM POOL ODDS: ${u.randomOddsNR ?? 'N/A'}
        - WAITING PERIOD AFTER DRAWING: ${u.waitingPeriod}
        - ADDITIONAL NOTES: ${u.notes}
        ###########################################
      `;
    } else {
      drawSummary = "NO OFFICIAL DRAW DATA IN DATABASE. Provide general draw advice only.";
    }

    // 3. PROMPT CONSTRUCTION
    const geoAnchor = unitStats?.description
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${unitStats.description}.`
      : `LOCATION: Analyze ${formData.state} Unit ${formData.unit}. EXPERT MODE.`;

    const trophyInstruction = hasData
      ? `PRIMARY TRUTH DATA: Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}.`
      : `EXPERT MODE: Provide realistic trophy ranges for ${formData.state} Unit ${formData.unit}.`;

    const geographicGuardrails = `
      ${geoAnchor}
      ${trophyInstruction}
      ${drawSummary}
      USER STATUS: ${formData.residency}
      MANDATORY COMPLIANCE:
      1. NO MARKDOWN: section titles ALL CAPS. No asterisks. No hashtags.
      2. TRUTH ADHERENCE: You MUST use the exact numbers provided in the DRAW DATA block.
    `;

    // Build mandatory truth block — handles both Wyoming and Utah draw info
    const wyDrawPoints = unitStats?.drawInfo?.regular?.minPoints;
    const utDrawPoints = unitStats?.utahDrawInfo?.bonusPointsToGuarantee;
    const drawPointsLabel = wyDrawPoints != null
      ? `REGULAR DRAW POINTS: ${wyDrawPoints}`
      : utDrawPoints != null
        ? `POINTS TO GUARANTEE: ~${utDrawPoints}`
        : `DRAW POINTS: See state wildlife agency for current data`;

    const mandatoryTruth = hasData ? `
      CRITICAL DATA - DO NOT HALLUCINATE:
      - UNIT LOCATION: ${unitStats?.description}
      - ${drawPointsLabel}
      - TOP-END TROPHY: ${unitStats?.topEnd}
    ` : "";

    // Pull the best draw reference value for inline prompt use
    const inlineDrawRef = wyDrawPoints != null
      ? `${wyDrawPoints} points minimum (regular pool)`
      : unitStats?.utahDrawInfo
        ? `Utah ${unitStats.utahDrawInfo.drawType} tag — NR allocation ${unitStats.utahDrawInfo.nrAllocation}, ~${unitStats.utahDrawInfo.nrTagsApprox ?? 'unknown'} NR tags issued, random odds ${unitStats.utahDrawInfo.randomOddsNR ?? 'unknown'}`
        : "consult state wildlife agency";

    let systemPrompt = "";
    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        ${mandatoryTruth}
        Generate a STRATEGIC BRIEF for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        SECTIONS: 1. UNIT OVERVIEW, 2. DRAW ODDS & RESIDENCY, 3. POPULATION AUDIT, 4. TROPHY AUDIT, 5. SUCCESSFUL STYLES, 6. TERRAIN & ACCESS, 7. HERD BEHAVIOR, 8. SURVIVAL & LOGISTICS.

        MANDATORY:
        - In SECTION 2 (DRAW ODDS), reference this draw data: ${inlineDrawRef}.
        - Mention that hunters should consult the state wildlife agency for current odds.
        - In Section 4, state the Top-End potential: ${unitStats?.topEnd ?? 'N/A'}.
      `;
    } else if (mode === 'GEAR') {
      systemPrompt = `${geographicGuardrails}\nGenerate a HYPER-DETAILED GEAR AUDIT. Weapon: ${formData.weapon}. Caliber families only.`;
    } else {
      systemPrompt = `${geographicGuardrails}\nTACTICAL DEEP DIVE. Context: ${context}`;
    }

    // 4. DIAGNOSTIC LOGS
    console.log(`--- DEBUG: Lookup for ${lookupKey} Unit ${unit} → resolved: ${unitResolved} ---`);
    console.log("UNIT KEY FOUND:", unitKey);
    console.log("FOUND IN DATA.TS?:", hasData);
    console.log("DRAW TYPE:", unitStats?.drawInfo ? 'Wyoming' : unitStats?.utahDrawInfo ? 'Utah' : 'None');
    console.log("DRAW SUMMARY SENT TO AI:", drawSummary);

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