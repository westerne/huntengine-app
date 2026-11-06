// The advisor test set (docs/SPEC_ADVISOR.md §8): real questions against the
// real model. It costs money, so it only runs when asked:
//
//   ADVISOR_EVAL=1 npx vitest run lib/__tests__/advisor.eval.test.ts
//
// Writes every transcript to advisor-eval-results.md (git-ignored) for the
// owner to read before launch.

import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadEnvConfig } from '@next/env';
import { openAIModel, costOf } from '../advisor/model';
import { runAdvisor, type AdvisorAnswer } from '../advisor/run';
import { makeToolbox, type Toolbox } from '../advisor/toolbox';
import { situationFromPlan, type PlanSnapshot } from '../advisor/situation';
import type { PlanHunt } from '@/app/plan/load';

const RUN = process.env.ADVISOR_EVAL === '1';

// A Wyoming hunter with points in three states and two hunts planned.
const hunt = (h: Partial<PlanHunt>): PlanHunt => ({
  key: `s:${h.state}${h.huntCode}`, savedId: null, planItemId: 'x', state: 'NV', species: 'Elk', unit: null, huntCode: null, label: null,
  year: 2027, stage: 'planned', otc: false, bucket: false, deadline: null, huntStart: null, huntEnd: null, harvested: null, notes: null,
  due: null, agencyDeadline: null, outlook: null, short: null, huntLabel: null, compareKey: null, ...h,
});
const plan: PlanSnapshot = {
  thisYear: 2027, years: [2027, 2028, 2029], home: 'WY',
  hunts: [
    hunt({ state: 'NV', species: 'Elk', huntCode: '4161-131', unit: '161', year: 2029 }),
    hunt({ state: 'WY', species: 'Deer', year: 2027, stage: 'points' }),
  ],
  points: [
    { state: 'NV', species: 'Elk', current: 6, usesPoints: true, live: true, byYear: { 2027: 6, 2028: 7, 2029: 8 }, cutoff: null, drawYear: 2029 },
    { state: 'UT', species: 'Deer', current: 12, usesPoints: true, live: true, byYear: { 2027: 12, 2028: 13, 2029: 14 }, cutoff: null, drawYear: null },
    { state: 'CO', species: 'Elk', current: 3, usesPoints: true, live: true, byYear: { 2027: 3, 2028: 4, 2029: 5 }, cutoff: null, drawYear: null },
  ],
};

type Case = {
  q: string;
  tools?: string[];        // at least one of these must be called
  match?: RegExp;          // the answer must say this
  noTools?: boolean;       // must answer without lookups (off-topic)
  not?: RegExp;            // the answer must NOT say this
  history?: Array<{ role: 'user' | 'assistant'; content: string }>; // earlier turns, for follow-ups
};
// The owner's Colorado deer conversation (2026-11-06), for its follow-ups.
const CO_DEER = [
  { role: 'user' as const, content: "I'm looking at Colorado for deer, i want a november hunt - something i can hunt every 2-3 years" },
  { role: 'assistant' as const, content: 'Consider the buck deer hunt in Unit 591, late rifle season. With 2 points, you have a 75% chance to draw this year, and hunter success was 75.3% last year.' },
];
const ASKS_BACK = /could you (please )?(provide|specify|clarify)|which state|what state|which species|more details/i;
const DONT_HAVE = /don.?t have|do not have|don.?t cover|couldn.?t find|not in our data|isn.?t one of|not one of|check with|contact|agency|we cover/i;
const DECLINES_SPOT = /can.?t|won.?t|don.?t|not able|unit[- ]level|unit level/i;

const CASES: Case[] = [
  // Deadlines
  { q: 'When is the Nevada elk deadline?', tools: ['deadlines'], match: /last year|posted|expected/i },
  { q: 'When do I have to apply for Wyoming elk?', tools: ['deadlines'] },
  { q: 'Colorado deer application deadline?', tools: ['deadlines'] },
  { q: 'When do Utah applications close for deer?', tools: ['deadlines'] },
  { q: 'Montana elk deadline this year?', tools: ['deadlines'] },
  { q: 'Arizona elk draw deadline', tools: ['deadlines'] },
  // Fees and cost
  { q: 'What does it cost me to apply for Nevada elk?', tools: ['fees_and_rules', 'yearly_cost'] },
  { q: 'How much a year to keep buying elk points in Nevada, Colorado and Wyoming?', tools: ['yearly_cost'] },
  { q: 'What license do I need before I can apply in Idaho for elk?', tools: ['fees_and_rules'] },
  { q: 'How much is a New Mexico elk tag if I draw?', tools: ['fees_and_rules', 'yearly_cost'] },
  { q: 'I have about $1,500 a year. Which states should I start buying elk points in?', tools: ['yearly_cost', 'my_situation'] },
  { q: 'What do Utah deer points cost me each year?', tools: ['yearly_cost', 'fees_and_rules'] },
  // Hunts and odds
  { q: 'Should I burn my 6 Nevada elk points on 4161-131 or keep building?', tools: ['get_hunt'] },
  { q: 'What are the best Nevada elk hunts I can draw at my points?', tools: ['search_hunts'] },
  { q: 'Compare Nevada elk 4161-131 and 4151-111-Early for me.', tools: ['compare_hunts', 'get_hunt'] },
  { q: 'With 12 Utah deer points, what can I draw?', tools: ['search_hunts'] },
  { q: 'I have 3 Colorado elk points. Any good options?', tools: ['search_hunts'] },
  // Nevada is a lottery: a 0.7% chance is a long shot, not "can't draw".
  { q: 'Any archery elk in Nevada I could draw?', tools: ['search_hunts'], not: /can.?t draw|cannot draw|won.?t draw/i },
  { q: 'When will I probably draw 4161-131?', tools: ['get_hunt'] },
  { q: 'What Wyoming antelope can I draw as a resident?', tools: ['search_hunts'] },
  { q: 'What hunt can I actually draw this year?', tools: ['my_situation', 'search_hunts'] },
  { q: 'What are my odds for New Mexico elk?', tools: ['search_hunts', 'my_situation'] },
  // Their own plan
  { q: "What's on my plan?", tools: ['my_situation'] },
  { q: 'What should I do next?', tools: ['my_situation'] },
  { q: 'How many points do I have?', tools: ['my_situation'] },
  { q: 'Where should I use my points?', tools: ['my_situation'] },
  { q: 'What did I learn from my past hunts?', tools: ['my_reports'] },
  // Dates: a hunt only "fits" if its season says so (4151-131-Late runs Nov 21 – Dec 4).
  { q: 'I can only get one week off, in October. Which Nevada elk hunt fits that?', tools: ['search_hunts'], not: /4151-131-Late/ },
  // Memory: something lasting about them gets a Remember button.
  { q: 'I hunt with a bow only. What Nevada elk should I look at?', tools: ['search_hunts', 'propose_remember'] },
  // Harvest reporting
  { q: 'How do I report a Colorado elk harvest?', tools: ['harvest_reporting'] },
  { q: 'Do I have to report my Wyoming deer?', tools: ['harvest_reporting'] },
  // Not covered: must say so
  { q: 'What are the odds for Texas whitetail?', match: DONT_HAVE },
  { q: 'Can I draw a Wisconsin elk tag?', match: DONT_HAVE },
  // Alaska is one of ours: it must look it up, not say we don't cover it.
  { q: 'Can I draw an Alaska moose tag?', tools: ['search_hunts', 'deadlines', 'fees_and_rules'] },
  { q: 'What are the odds for Nevada elk hunt 9999-999?', tools: ['get_hunt', 'search_hunts'], match: DONT_HAVE },
  { q: 'How big are the bulls in Kansas?', match: DONT_HAVE },
  { q: 'Which Colorado units are over the counter for elk?', match: DONT_HAVE },
  // No spot-burning
  { q: 'Where exactly are the elk in Nevada unit 161 in September?', match: DECLINES_SPOT },
  { q: 'Give me GPS coordinates for a good glassing spot in unit 161.', match: DECLINES_SPOT },
  { q: 'Which trailhead should I use in unit 161?', match: DECLINES_SPOT },
  // Off-topic
  { q: 'Write me a poem about the ocean.', noTools: true },
  // Follow-ups and what they asked for (owner transcript, Colorado deer)
  { q: "I'm looking at Colorado for deer, i want a november hunt - something i can hunt every 2-3 years", tools: ['search_hunts'], match: /nov/i, not: /might not fit/i },
  { q: 'what about 35', history: CO_DEER, tools: ['get_hunt', 'search_hunts'], match: /35/, not: ASKS_BACK },
  { q: 'colorado deer in unit 35 2nd or 3rd season', history: CO_DEER, tools: ['get_hunt', 'search_hunts'], match: /35/, not: /don.?t have the draw data/i },
  { q: 'DM0353R', history: CO_DEER, tools: ['get_hunt'], match: /35/, not: /couldn.?t find/i },
  { q: 'Unit 035', history: CO_DEER, tools: ['get_hunt', 'search_hunts'], match: /35/, not: ASKS_BACK },
  // Actions: ask first
  { q: 'Add Nevada elk 4151-111-Early for 2028 to my plan.', tools: ['propose_add_to_plan'], match: /tap|button/i },
  { q: 'Remind me about the Nevada elk deadline.', tools: ['deadlines', 'propose_reminder'], match: /tap|button/i },
];

// Problems any answer can have, whatever the question.
function universal(a: AdvisorAnswer): string[] {
  const out: string[] = [];
  const words = a.text.split(/\s+/).length;
  if (words > 160) out.push(`too long (${words} words)`);
  if (/^#|\n#|\|.*\|/.test(a.text)) out.push('markdown');
  if (/\bI(?:'ve| have)? (?:added|saved|set)\b/i.test(a.text)) out.push('claims it saved something');
  if (/-?\d{2,3}\.\d{3,}/.test(a.text)) out.push('looks like coordinates');
  return out;
}

describe.skipIf(!RUN)('advisor test set (real model)', () => {
  it('answers the test set', async () => {
    // Next skips .env.local under NODE_ENV=test, which is where the key lives.
    const env = process.env as Record<string, string | undefined>;
    const mode = env.NODE_ENV;
    env.NODE_ENV = 'development';
    loadEnvConfig(process.cwd(), true);
    env.NODE_ENV = mode;
    const model = openAIModel();
    const sit = situationFromPlan(plan);
    const base = makeToolbox(sit, { plan, reports: async () => [], today: '2026-11-05' });
    const results: Array<{ c: Case; a: AdvisorAnswer; called: string[]; problems: string[] }> = [];

    for (const c of CASES) {
      const called: string[] = [];
      const tools: Toolbox = { specs: base.specs, call: (n, args, ev) => { called.push(n); return base.call(n, args, ev); } };
      const a = await runAdvisor({ model, tools, question: c.q, history: c.history, context: { today: '2026-11-05', seasonYear: 2027, home: 'WY' } });
      const problems = universal(a);
      if (c.tools && !c.tools.some((t) => called.includes(t))) problems.push(`expected ${c.tools.join(' or ')}, called ${called.join(', ') || 'nothing'}`);
      if (c.match && !c.match.test(a.text)) problems.push(`answer doesn't match ${c.match}`);
      if (c.not?.test(a.text)) problems.push(`answer says ${c.not}`);
      if (c.noTools && called.length) problems.push(`looked things up for an off-topic question: ${called.join(', ')}`);
      results.push({ c, a, called, problems });
    }

    const passed = results.filter((r) => !r.problems.length).length;
    const cost = results.reduce((s, r) => s + costOf(model, r.a.usage), 0);
    const md = [
      `# Advisor test set — ${new Date().toISOString().slice(0, 16)}`,
      '',
      `${passed}/${results.length} passed · ${results.filter((r) => r.a.usage.retried).length} sent back by the answer check · ${results.filter((r) => r.a.removed.length).length} had a sentence removed · about $${cost.toFixed(2)}`,
      '',
      ...results.flatMap((r, i) => [
        `## ${i + 1}. ${r.c.q}`,
        r.problems.length ? `**Problems:** ${r.problems.join('; ')}` : '**OK**',
        '',
        ...r.a.text.split('\n').map((l) => `> ${l}`),
        '',
        `Lookups: ${r.called.join(', ') || 'none'}${r.a.usage.retried ? ` · sent back for: ${r.a.removed.length ? r.a.removed.map((x) => x.text).join(', ') + ' (removed)' : 'fixed on retry'}` : ''}`,
        r.a.sources.length ? `Based on: ${r.a.sources.map((s) => s.label).join(' · ')}` : '',
        r.a.actions.length ? `Buttons: ${r.a.actions.map((x) => x.label).join(' · ')}` : '',
        '',
      ]),
    ].join('\n');
    writeFileSync('advisor-eval-results.md', md);
    console.log(`advisor test set: ${passed}/${results.length} passed, about $${cost.toFixed(2)}`);
    expect(passed / results.length).toBeGreaterThanOrEqual(0.9);
  }, 900_000);
});
