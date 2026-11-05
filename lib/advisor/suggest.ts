// Suggested questions for an empty advisor sheet (docs/SPEC_ADVISOR.md §3),
// chosen from the hunter's own situation. Pure, and no AI: these are prompts
// for the hunter to tap, not answers.

import type { PlanSnapshot } from './situation';
import { speciesKeyOf } from '../species';

const DEFAULTS = [
  'What can I draw this year?',
  'Where should I use my points?',
  'What does a year of points cost me?',
  'I have about $1,500 a year. Where should I start buying points?',
];

export function suggestQuestions(plan: PlanSnapshot | null, max = 4): string[] {
  const out: string[] = [];
  const add = (q: string) => { if (!out.includes(q)) out.push(q); };
  if (plan) {
    const live = plan.hunts.filter((h) => h.year == null || h.year >= plan.thisYear);
    const sp = (s: string) => s.toLowerCase();

    // A tag in hand outranks everything.
    const tag = live.find((h) => h.stage === 'drew' || h.stage === 'prepping');
    if (tag) add(`What should I do before opening day for my ${tag.state} ${sp(tag.species)} hunt?`);

    // A specific hunt they're aiming at: apply now or keep building?
    const target = live.find((h) => h.huntCode && ['planned', 'considering', 'points'].includes(h.stage) && !h.otc);
    if (target) add(`Should I apply for ${target.state} ${sp(target.species)} ${target.huntCode} or keep building points?`);

    // Points held where nothing is planned.
    const planned = new Set(live.map((h) => `${h.state}|${speciesKeyOf(h.species, h.state)}`));
    const idle = plan.points
      .filter((p) => p.usesPoints && p.live && (p.current ?? 0) > 0 && !planned.has(`${p.state}|${speciesKeyOf(p.species, p.state)}`))
      .sort((a, b) => (b.current ?? 0) - (a.current ?? 0))[0];
    if (idle) add(`Where should I use my ${idle.current} ${idle.state} ${sp(idle.species)} points?`);

    // The next application on the plan.
    const due = live.find((h) => !h.otc && ['planned', 'considering', 'points'].includes(h.stage) && h.year === plan.thisYear);
    if (due) add(`When is the ${due.state} ${sp(due.species)} deadline?`);
  }
  for (const q of DEFAULTS) add(q);
  return out.slice(0, max);
}
