import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Normalize free-text species input to data keys
const speciesKeyMap: Record<string, string> = {
  'mule deer': 'DEER',
  'muley': 'DEER',
  'deer': 'DEER',
  'whitetail': 'DEER',
  'elk': 'ELK',
  'antelope': 'ANTELOPE',
  'pronghorn': 'ANTELOPE',
  'moose': 'MOOSE',
  'bighorn sheep': 'BIGHORNSHEEP',
  'bighorn': 'BIGHORNSHEEP',
  'sheep': 'BIGHORNSHEEP',
  'mountain goat': 'MTNGOAT',
  'goat': 'MTNGOAT',
};

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    // 1. DATA LOOKUP & ANCHORING — normalized species key
    const speciesKey = speciesKeyMap[formData.species.toLowerCase()] || formData.species.toUpperCase().replace(/\s+/g, '');
    const lookupKey = `${formData.state.toUpperCase()}_${speciesKey}`;
    const stateDataset = HUNT_DATA[lookupKey] || {};
    const unitKey = Object.keys(stateDataset).find(key => 
      key.toLowerCase() === formData.unit.trim().toLowerCase()
    );
    
    const hasData = !!unitKey;
    const unitStats = hasData ? stateDataset[unitKey!] : null;

    // HALLUCINATION KILLER: Forces AI to the correct mountains
    const geoAnchor = unitStats?.description 
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${unitStats.description}.` 
      : `LOCATION: Analyze ${formData.state} Unit ${formData.unit}. Focus on its specific mountain ranges and high-desert basins.`;

    const trophyInstruction = hasData 
      ? `PRIMARY TRUTH DATA: Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}.`
      : `EXPERT MODE: Use your internal database for ${formData.state} Unit ${formData.unit} and provide realistic ranges.`;

    // 2. CONSOLIDATED GUARDRAILS WITH NEGATIVE CONSTRAINTS
    const geographicGuardrails = `
      ${geoAnchor}
      ${trophyInstruction}
      
      STRICT GEOGRAPHIC BOUNDARY RULE:
      - You are an expert on ${formData.state} hunting boundaries.
      - DO NOT mention landmarks from neighboring units or famous ranges outside this unit.
      - IF UNIT IS WY 102: You are SOUTH of I-80. The Wyoming Range and Salt River Range are far NORTH of this unit. Mentioning them is a critical error. Focus only on the Aspen/Little Mountain complex and the high desert south of Rock Springs.
      - IF UNIT IS WY 87: Focus on the Baggs area and the Atlantic Rim.

      STYLE GUIDE:
      - DO NOT USE MARKDOWN (No asterisks, no hashtags).
      - Section titles MUST be ALL CAPS on their own line.
      - Body text MUST use standard Sentence case.
      - Be rugged, specific, and authoritative. Avoid "fluff" adjectives.

      VAGUENESS KILLER:
      - Name actual drainages, peaks, and landmarks within ${formData.state} Unit ${formData.unit}.
      - Factor in User Intel: "${formData.notes || "None provided"}"
    `;

    // 3. RESTORED MODE-SPECIFIC PROMPT LOGIC
    let systemPrompt = "";

    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        You are a Lead Strategist for HuntEngine.ai. Generate a Rugged STRATEGIC BRIEF for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        
        SECTIONS:
        1. UNIT OVERVIEW: Terrain personality and landscape features.
        2. POPULATION AUDIT: Herd health/density trending.
        3. TROPHY AUDIT: Use the stats provided. Explain 'Typical' vs 'Top-End' outliers.
        4. SUCCESSFUL STYLES: Infrastructure-based style (Backcountry, Base Camp, or Hotel).
        5. DURATION: Recommended days to hunt this terrain.
        6. GEAR AUDIT: High-level unit-specific needs.
        7. TERRAIN & ACCESS: Access roads and topography pinch points.
        8. HERD BEHAVIOR: Density based on ${formData.huntDates} and elevation bands.
        9. SURVIVAL & LOGISTICS: Fuel/comms and weather threats.
      `;
    } else if (mode === 'GEAR') {
      systemPrompt = `
        ${geographicGuardrails}
        Generate a HYPER-DETAILED GEAR AUDIT for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        Weapon: ${formData.weapon} | Group Size: ${formData.groupSize} | Dates: ${formData.huntDates}.
        Focus on: Boot stiffness for this rock type, glassing tripod height for this brush, and calorie density.
      `;
    } else {
      systemPrompt = `
        ${geographicGuardrails}
        You are in DEEP DIVE TACTICAL mode. Context from Strategic Brief: ${context}
        Provide a 72-hour day-by-day action plan for a ${formData.groupSize}-person team.
        TITLES: 1. THE TACTICAL 72 HOUR PLAN, 2. WEATHER PIVOTS, 3. PLAN B, 4. REMOTE AREAS, 5. LOGISTICS.
        Focus on specific morning glassing spots and evening ambush points in Unit ${formData.unit}.
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.1,
    });

    // Return coords alongside strategy so the frontend can use them for the map
    return NextResponse.json({ 
      strategy: response.choices[0].message.content,
      coords: unitStats?.coords || null,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ strategy: "Uplink Failed.", coords: null }, { status: 500 });
  }
}