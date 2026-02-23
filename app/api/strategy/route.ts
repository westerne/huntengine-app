import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
      
      GEOGRAPHIC ACCURACY:
      - Verify all landmarks are strictly within ${formData.state} Unit ${formData.unit}.
      - IMPORTANT: In Idaho 54, the high-elevation paved access is Magic Mountain. Pomerelle is in Unit 55. Do not confuse them.
    `;

    let systemPrompt = "";

    if (mode === 'MACRO') {
      systemPrompt = `
        ${geographicGuardrails}
        You are a Lead Strategist for HuntEngine.ai. Generate a 6-Point Macro Unit Brief for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        SECTIONS: 1. UNIT OVERVIEW, 2. POPULATION AUDIT, 3. TROPHY POTENTIAL, 4. SUCCESSFUL STYLES, 5. DURATION RECOMMENDATION, 6. GEAR AUDIT.
      `;
    } else if (mode === 'GEAR') {
      systemPrompt = `
        ${geographicGuardrails}
        Generate a HYPER-DETAILED GEAR AUDIT for ${formData.species} in ${formData.state} Unit ${formData.unit}.
        Weapon: ${formData.weapon} | Group: ${formData.groupSize}.
      `;
    } else {
      systemPrompt = `
        ${geographicGuardrails}
        You are in DEEP DIVE TACTICAL mode. Context: ${context}
        Generate a MISSION PLAN for a ${formData.groupSize}-person team. 
        TITLES: 1. THE TACTICAL 72 HOUR PLAN, 2. WEATHER PIVOTS, 3. PLAN B, 4. REMOTE & LESS-PRESSURED AREAS, 5. LOGISTICS.
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