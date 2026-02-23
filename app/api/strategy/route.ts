import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { mode, formData, context = '' } = await req.json();

    // UNIVERSAL GEOGRAPHIC GUARDRAILS
    const geographicGuardrails = `
      CRITICAL GEOGRAPHIC ACCURACY:
      - Verify all landmarks, resorts, and towns are strictly within or adjacent to ${formData.state} Unit ${formData.unit}.
      - IMPORTANT: In Idaho 54, the high-elevation paved access is Magic Mountain. Pomerelle is in Unit 55. Do not confuse them.
      - If road density is high (e.g. ID Unit 54), prioritize 'Base Camp' or 'Hotel/Commuter' styles over 'Backcountry'.
    `;

    let systemPrompt = "";

    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        You are a Lead Strategist for HuntEngine.ai. Generate a 6-Point Macro Unit Brief for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        
        SECTIONS:
        1. UNIT OVERVIEW: Terrain personality and landscape features.
        2. POPULATION AUDIT: Herd health and density for ${formData.species}.
        3. TROPHY POTENTIAL: Realistic buck/bull expectations vs. outliers.
        4. SUCCESSFUL STYLES: Infrastructure-based style (Backcountry, Base Camp, or Hotel).
        5. DURATION RECOMMENDATION: Recommended days to hunt this terrain.
        6. GEAR AUDIT: High-level unit-specific gear needs (e.g. glassing needs, tire chains).
      `;
    } 
    else if (mode === 'GEAR') {
      systemPrompt = `
        ${geographicGuardrails}
        Generate a HYPER-DETAILED GEAR AUDIT for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        Weapon: ${formData.weapon} | Group: ${formData.groupSize} | Assets: ${formData.atv ? 'ATV' : 'No ATV'}.
        
        Structure the list by:
        1. OPTICS & GLASSING: Specific tripod/spotter needs for these canyons.
        2. CLOTHING SYSTEM: Layering requirements based on ${formData.huntDates} typical weather.
        3. UNIT-SPECIFIC HARDWARE: (e.g. Tire chains for local mud, trekking poles for vertical).
        4. KILL KIT & PACK: Recovery tools for a group of ${formData.groupSize}.
      `;
    } 
    else {
      // DEFAULT TO MISSION PLAN (MICRO)
      systemPrompt = `
        ${geographicGuardrails}
        You are in DEEP DIVE TACTICAL mode. Use the Macro context as your truth: ${context}
        
        Generate a comprehensive MISSION PLAN for a ${formData.groupSize}-person team. 
        YOU MUST INCLUDE THESE 5 CATEGORIES:
        1. THE TACTICAL 72: A play-by-play for the first 3 days.
        2. WEATHER PIVOTS: How snow, heat, or wind shifts animals in this specific topography.
        3. PLAN B DRAINAGES: 2-3 specific alternative areas in Unit ${formData.unit} if the primary spot is crowded.
        4. OPTICAL DEAD ZONES: Specific pockets hidden from road-view.
        5. LOGISTICS: Local meat processors and recovery plan for ${formData.groupSize} hunters.
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
    });

    return NextResponse.json({ strategy: response.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ strategy: "Uplink Failed. Check API Key." }, { status: 500 });
  }
}