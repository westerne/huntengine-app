import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from '../strategy/data';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const speciesKeyMap: Record<string, string> = {
  'mule deer': 'DEER', 'elk': 'ELK', 'antelope': 'ANTELOPE',
  'moose': 'MOOSE', 'bighorn sheep': 'BIGHORNSHEEP', 'mountain goat': 'MTNGOAT',
};

function buildUnitDataBlock(states: string[], species: string, residency: string, points: Record<string, number>) {
  const speciesKey = speciesKeyMap[species.toLowerCase()] || species.toUpperCase();
  let block = '';

  for (const state of states) {
    const lookupKey = `${state}_${speciesKey}`;
    const dataset = HUNT_DATA[lookupKey];
    if (!dataset) continue;

    block += `\n=== ${state} ${speciesKey} UNITS ===\n`;

    for (const [unitName, unitStats] of Object.entries(dataset)) {
      const hunterPoints = points[state] || 0;
      const isResident = residency.toLowerCase().includes('resident');

      let drawLine = '';
      if (isResident && (unitStats as any).residentDrawInfo) {
        const r = (unitStats as any).residentDrawInfo;
        drawLine = `Resident odds: ${r.approxOdds} (${r.quota} tags, ${r.firstChoiceApplicants} applicants)`;
      } else if ((unitStats as any).drawInfo?.regular) {
        const d = (unitStats as any).drawInfo;
        const minPts = d.regular?.minPoints;
        drawLine = minPts != null
          ? `NR min points: ${minPts} | Random odds: ${d.random?.approxOdds ?? 'N/A'}`
          : `NR draw: ${d.random?.approxOdds ?? 'consult WGFD'}`;
      } else if ((unitStats as any).utahDrawInfo) {
        const u = (unitStats as any).utahDrawInfo;
        drawLine = `Utah ${u.drawType} | NR odds: ${u.randomOddsNR ?? 'N/A'} | Points to guarantee: ${u.bonusPointsToGuarantee ?? 'N/A'}`;
      }

      block += `Unit ${unitName}: typical=${unitStats.typical} topEnd=${unitStats.topEnd} trait="${unitStats.trait}" location="${unitStats.description}" ${drawLine}\n`;
    }
  }

  return block;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { states, species, residency, points, weapon, huntStyle, fitness, goal, timeline, seasonPreference, notes } = body;

    const unitDataBlock = buildUnitDataBlock(states, species, residency, points);

    const systemPrompt = `You are HuntEngine.ai — a western hunting intelligence system built from decades of real field experience.

Your job is to analyze a hunter's profile and recommend the best matching hunt units from the data provided.

HUNTER PROFILE:
- States: ${states.join(', ')}
- Species: ${species}
- Residency: ${residency}
- Points: ${JSON.stringify(points)}
- Weapon: ${weapon}
- Hunt Style: ${huntStyle}
- Fitness Level: ${fitness}
- Trophy Goal: ${goal}
- Timeline: ${timeline}
- Season Preference: ${seasonPreference}
- Notes: ${notes || 'None'}

AVAILABLE UNIT DATA:
${unitDataBlock}

RANKING INSTRUCTIONS:
Score each unit on four criteria and rank by total score:

1. DRAW FEASIBILITY (0-25 points)
   - Can draw this year with current points: 25
   - Drawable within 1-3 years: 15
   - Long-term build (4+ years): 5
   - Cannot draw: 0

2. TROPHY MATCH (0-25 points)
   - Match trophy goal to unit quality

3. HUNT STYLE MATCH (0-25 points)
   - Match terrain and access to hunting style

4. FITNESS MATCH (0-25 points)
   - Match terrain difficulty to fitness level

MANDATORY OUTPUT RULES:
- Respond ONLY with valid JSON — no markdown, no backticks, no explanation
- Return exactly 5-10 units ranked 1 through N
- whyItFits must be 2-3 sentences specific to this hunter's profile
- Reference actual draw odds from the data
- Do not recommend units the hunter cannot realistically draw given their timeline`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Recommend API Error:", error);
    return NextResponse.json({ recommendations: [] }, { status: 500 });
  }
}