import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    // 1. Create a key like "UTAH_ELK"
    const lookupKey = `${formData.state.toUpperCase()}_${formData.species.toUpperCase()}`;
    const stateDataset = HUNT_DATA[lookupKey] || {};

    // 2. Find the specific unit in that state's data
    const unitKey = Object.keys(stateDataset).find(key => 
      formData.unit.toLowerCase().includes(key.toLowerCase())
    );
    
    const unitStats = unitKey ? stateDataset[unitKey] : { 
      typical: "Check local harvest reports", 
      topEnd: "Unit-specific outlier", 
      trait: "Regional standard" 
    };

    const geographicGuardrails = `
      CRITICAL: You are a Lead Scout. Use these HARD STATS for ${formData.unit}:
      - TYPICAL MATURE: ${unitStats.typical}
      - TOP-END POTENTIAL: ${unitStats.topEnd}
      - KEY TRAIT: ${unitStats.trait}
      
      If these stats are "Check local", provide a conservative estimate based on the state average.
      DO NOT USE MARKDOWN. NO ASTERISKS.
    `;

    // ... continue with OpenAI call ...

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    const geographicGuardrails = `
      CRITICAL: DO NOT USE MARKDOWN. 
      - DO NOT use asterisks (**) for bolding or lists.
      - DO NOT use hashtags (#) for headers.
      - Use PLAIN TEXT ONLY.
      - For headers, simply type the title in ALL CAPS on its own line.
      - Use simple dashes (-) for bullet points.

      CRITICAL: AVOID GENERIC LANGUAGE.
      - DO NOT use phrases like "diverse flora and fauna," "challenging terrain", or "bring high-quality optics."
      - BE SPECIFIC: Name actual drainages, peaks, or ridges within ${formData.state} Unit ${formData.unit}.
      - DATA-DRIVEN: Mention specific forage (e.g., Mountain Mahogany, Basin Big Sagebrush) and specific water sources.
      - FORMATTING: NO MARKDOWN. Use ALL CAPS for headers. Use dashes (-) for lists.
      
      GEOGRAPHIC ACCURACY:
      - Verify all landmarks are strictly within ${formData.state} Unit ${formData.unit}.
      - IMPORTANT: In Idaho 54, the high-elevation paved access is Magic Mountain. Pomerelle is in Unit 55. Do not confuse them.
    `;

    let systemPrompt = "";

   if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        You are a Lead Strategist for HuntEngine.ai. Generate a Rugged STRATEGIC BRIEF for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        Based on but not limited to the following context:
        SECTIONS:
        1. UNIT OVERVIEW: Terrain personality and landscape features.
        2. POPULATION AUDIT: Herd health and density for ${formData.species}. Use recent information to say whether the herd is trending up, trending down, or stable.
        
        3. TROPHY AUDIT/POTENTIAL (SCORE AUDIT): 
           - Provide realistic score ranges in inches for ${formData.species}.
           - Categorize by: 'Typical Mature' (what a good hunter expects) and 'Top-End' (unit outliers).
           - Base this on recent harvest data and biological potential of the region.
           - a 180 mule deer buck is a big buck, the very best units have 190+ potential.
           - a 350 elk bull is a big bull, the very best units have 380+ potential.
           - list the trophy range, with top end potential (that 1:200 type animal) and the typical mature range (what a good hunter can expect with solid effort).
        
        4. SUCCESSFUL STYLES: Infrastructure-based style (Backcountry, Base Camp, or Hotel).
        5. DURATION RECOMMENDATION: Recommended days to hunt this terrain.
        6. GEAR AUDIT: High-level unit-specific gear needs.
        7. TERRAIN & ACCESS: Identify the primary access roads and the specific "pinch points" created by the topography.
        8. HERD BEHAVIOR: Where is the ${formData.species} density right now based on ${formData.huntDates}? Mention elevation bands (e.g., 7,500ft - 9,000ft).
        9. SURVIVAL & LOGISTICS: Identify the nearest reliable fuel/comms and the specific weather threat for this unit.
      `;
    } else if (mode === 'GEAR') {
      systemPrompt = `
        ${geographicGuardrails}
        Generate a HYPER-DETAILED GEAR AUDIT for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        Weapon: ${formData.weapon} | Group: ${formData.groupSize}.
        Focus on: The exact boot stiffness recommended for this rock type, the specific glassing tripod height for this brush height, and the localized calorie needs.
      `;
    } else {
      systemPrompt = `
        ${geographicGuardrails}
        You are in DEEP DIVE TACTICAL mode. Context: ${context}
        provide a 72 hour, day by day action plan. Generate a MISSION PLAN for a ${formData.groupSize}-person team. 
        Suggested: Day 1: specific morning glassing point and evening ambush spot, Day 2: mid-day canyon push or move to a new area, Day 3: Keep moving to new area until target buck is located, etc.
        Suggested TITLES: 1. THE TACTICAL 72 HOUR PLAN, 2. WEATHER PIVOTS, 3. PLAN B, 4. REMOTE & LESS-PRESSURED AREAS, 5. LOGISTICS.
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.3, // Lower temperature makes the AI follow formatting rules strictly.
    });

    return NextResponse.json({ strategy: response.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ strategy: "Uplink Failed." }, { status: 500 });
  }
}