import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    // 1. DATA LOOKUP (UTAH_ELK, UTAH_DEER, etc.)
    const lookupKey = `${formData.state.toUpperCase()}_${formData.species.toUpperCase()}`;
    const stateDataset = HUNT_DATA[lookupKey] || {};

    const unitKey = Object.keys(stateDataset).find(key => 
      formData.unit.toLowerCase().includes(key.toLowerCase())
    );
    
    const unitStats = unitKey ? stateDataset[unitKey] : { 
      typical: "Check local harvest reports", 
      topEnd: "Unit-specific outlier", 
      trait: "Regional standard" 
    };

    // 2. CONSOLIDATED GUARDRAILS
    const geographicGuardrails = `
      CRITICAL: DO NOT USE MARKDOWN. 
      - NO asterisks (**), NO hashtags (#). 
      - Use ALL CAPS for headers. Use dashes (-) for lists.
      - USE PLAIN TEXT ONLY.

      VAGUENESS KILLER:
      - AVOID generic phrases like "diverse flora" or "challenging terrain."
      - BE SPECIFIC: Name actual drainages and peaks within ${formData.state} Unit ${formData.unit}.
      - DATA-DRIVEN: Mention specific forage (Mountain Mahogany, Basin Big Sage) and water sources.
      
      USER INTEL:
      - Factor in these Field Notes: "${formData.notes || "None provided"}"

      HARD TROPHY STATS FOR THIS UNIT:
      - TYPICAL MATURE: ${unitStats.typical}
      - TOP-END POTENTIAL: ${unitStats.topEnd}
      - GENETIC TRAIT: ${unitStats.trait}
      
      GEOGRAPHIC ACCURACY:
      - Verify all landmarks are strictly within ${formData.state} Unit ${formData.unit}.
    `;

    let systemPrompt = "";

    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        You are a Lead Strategist for HuntEngine.ai. Generate a Rugged STRATEGIC BRIEF for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        
        SECTIONS:
        1. UNIT OVERVIEW: Terrain personality and landscape features.
        2. POPULATION AUDIT: Herd health/density trending.
        3. TROPHY AUDIT: Use the HARD STATS provided above. Explain the 'Typical Mature' vs 'Top-End' outliers.
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
        Weapon: ${formData.weapon} | Group: ${formData.groupSize}.
        Focus on: Boot stiffness for this rock type, glassing tripod height for this brush, and localized calories.
      `;
    } else {
      systemPrompt = `
        ${geographicGuardrails}
        You are in DEEP DIVE TACTICAL mode. Context: ${context}
        Provide a 72-hour day-by-day action plan for a ${formData.groupSize}-person team.
        Day 1: Morning glassing/Evening ambush. Day 2: Mid-day canyon push/Move. Day 3: Relocation/Recovery.
        TITLES: 1. THE TACTICAL 72 HOUR PLAN, 2. WEATHER PIVOTS, 3. PLAN B, 4. REMOTE AREAS, 5. LOGISTICS.
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.3,
    });

    return NextResponse.json({ strategy: response.choices[0].message.content });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ strategy: "Uplink Failed." }, { status: 500 });
  }
}