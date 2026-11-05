// One advisor turn (docs/SPEC_ADVISOR.md §6): model → tool calls → model →
// answer, then the answer check. Every number and date in the answer must have
// come from a lookup this turn or from the hunter. If one didn't, the model
// gets one chance to fix it; after that the sentence carrying it is removed.
// The "Based on" sources are the lookups that actually ran, never model text.

import { unsupportedClaims, type Unsupported } from './check';
import type { AdvisorModel, ChatMessage } from './model';
import type { Action, Toolbox } from './toolbox';
import type { Source } from './tools';
import { STATE_INFO } from '../huntdata/registry';
import { titleCaseState } from '../scoutData';

export type Turn = { role: 'user' | 'assistant'; content: string };
export type AdvisorAnswer = {
  text: string;
  sources: Source[];
  actions: Action[];
  removed: Unsupported[];     // claims taken out after the retry
  usage: { input: number; output: number; modelCalls: number; toolCalls: number; retried: boolean; flagged: number };
};

export const MAX_TOOL_CALLS = 6;
const MAX_ACTIONS = 3;
const MAX_STEPS = 8;
const HISTORY_TURNS = 10;

const COVERED = Object.values(STATE_INFO).map((s) => titleCaseState(s.name)).join(', ');

export function systemPrompt(o: { today: string; seasonYear: number; home: string | null }): string {
  return `You are the HuntQuarters advisor: a hunter talking to a hunter about draws, points, deadlines, costs and planning.

Today is ${o.today}. The season being planned is ${o.seasonYear}. The hunter's home state is ${o.home ?? 'not set'}.

We cover only these states: ${COVERED}. For any other state, say we don't cover it yet and point them to that state's wildlife agency. Don't answer from memory.
We don't have these yet, so say "we don't have that yet" plainly: trophy or antler size, lists of over-the-counter units, land access beyond public land, tactics and gear.

Rules you never break:
1. Every odds figure, point count, date, fee, rule and success rate comes from a tool result this turn. Never from memory. That includes words like "good chance" or "non-refundable": don't say them unless a lookup shows it. If no tool has it, say "we don't have that" and point them to the state agency.
2. Say how old a figure is. A last-year deadline is "last year's date". A future chance is "if odds stay like last year's", never a promise. If oddsAreYours is false, the rate is the hunt's overall rate, not theirs — say so.
3. Lead with a decision: one recommendation on the first line, then why (with the number), the main tradeoff, and the next step. Only add detail if they ask.
4. You can't save anything. To add a hunt to their plan or set a reminder, call propose_add_to_plan or propose_reminder; the hunter sees a button and decides. Mention a button only if you called one of those this turn, and then say it exactly like "Tap the button below to add it" or "Tap the button below for a reminder". Never write "I've added", "I've set" or "I set up": nothing is saved until they tap. Every deadlines lookup already puts a reminder button under your answer, so don't call propose_reminder for a deadline and don't ask whether they want a reminder; just say "Tap the button below for a reminder". Use propose_reminder only for other things worth remembering. Never write a tool or button name as text.
5. Never name specific spots, trails, roads, coordinates, or where animals are. Unit-level facts only.
6. Short and plain: 5th-grade reading level, under 120 words. Plain text only: no headings, tables, bold, or links. Short lines are fine; "Tradeoff:" and "Next:" lines are welcome.
7. Don't list sources in your answer; the app shows them.
8. If the question isn't about hunting plans, say briefly that you only help with hunt planning.

Always look things up before answering about a hunt, state or species we cover, even if you expect nothing comes back. For questions about their own points or plan, call my_situation first; never ask which state or species when my_situation can tell you. Don't guess hunt codes: use search_hunts to find them. To weigh two or more hunts, use compare_hunts.
For "when will I draw", use likelyBy (the first year they're more likely than not to have drawn). If it's empty, say it isn't likely within the years shown and give chanceBy5 with throughYear. Never name a year as when they'll draw just because they apply that year.`;
}

// Plain text for the sheet: markdown the model slipped in is unwrapped, and a
// "tap the button" with no button behind it is taken out.
export function tidy(text: string, hasActions: boolean): string {
  let t = text
    .replace(/\[([^\]]+)\]\((?:https?:[^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    // A tool or button name written out instead of called.
    .replace(/^\s*(?:functions\.\w+|set reminder|add reminder|add to (?:my )?plan)\s*$/gim, '');
  if (!hasActions) t = dropSentences(t, [{ text: '__button__', kind: 'number' }], (s) => /\b(tap|click|use|press)\b[^.]*\bbuttons?\b/i.test(s));
  return t.trim();
}

// Sentences whose claims couldn't be backed up are dropped rather than shown.
export function dropSentences(text: string, bad: Unsupported[], also?: (s: string) => boolean): string {
  const hit = (s: string) => bad.some((b) => s.includes(b.text)) || !!also?.(s);
  return text
    .split('\n')
    .map((line) => line.split(/(?<=[.!?])\s+/).filter((s) => !hit(s)).join(' ').trimEnd())
    .filter((line, i, all) => line.trim() || (i > 0 && all[i - 1].trim()))
    .join('\n')
    .trim();
}

export async function runAdvisor(o: {
  model: AdvisorModel;
  tools: Toolbox;
  question: string;
  history?: Turn[];
  context: { today: string; seasonYear: number; home: string | null };
  onStatus?: (text: string) => void;
}): Promise<AdvisorAnswer> {
  const history = (o.history ?? []).slice(-HISTORY_TURNS);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(o.context) },
    ...history.map((t) => ({ role: t.role, content: t.content } as ChatMessage)),
    { role: 'user', content: o.question },
  ];
  // What the hunter said, and earlier answers (which passed this check when
  // they were given), count as evidence alongside this turn's lookups.
  const evidence: string[] = [
    ...history.map((t) => t.content), o.question,
    // What the system prompt told it is fair to repeat.
    `today ${o.context.today} season ${o.context.seasonYear}`,
  ];
  const sources = new Map<string, Source>();
  const actions: Action[] = [];
  const usage = { input: 0, output: 0, modelCalls: 0, toolCalls: 0, retried: false, flagged: 0 };

  async function converse(): Promise<string> {
    for (let step = 0; step < MAX_STEPS; step++) {
      const turn = await o.model.turn(messages, usage.toolCalls < MAX_TOOL_CALLS ? o.tools.specs : []);
      usage.modelCalls++;
      usage.input += turn.usage.input;
      usage.output += turn.usage.output;
      if (!turn.toolCalls.length) return (turn.text ?? '').trim();

      messages.push({ role: 'assistant', content: turn.text, toolCalls: turn.toolCalls });
      for (const call of turn.toolCalls) {
        usage.toolCalls++;
        let content: string;
        if (usage.toolCalls > MAX_TOOL_CALLS) {
          content = JSON.stringify({ error: 'That is enough lookups for one question. Answer with what you have.' });
        } else {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(call.args || '{}'); } catch { /* the tool reports what's missing */ }
          const { result, status, action } = await o.tools.call(call.name, args, evidence);
          o.onStatus?.(status);
          if (result.ok) {
            content = JSON.stringify(result.data);
            for (const s of result.sources) sources.set(s.label, s);
          } else {
            content = JSON.stringify({ error: result.reason });
          }
          if (action && actions.length < MAX_ACTIONS && !actions.some((x) => x.label === action.label)) actions.push(action);
        }
        evidence.push(content);
        messages.push({ role: 'tool', toolCallId: call.id, content });
      }
    }
    return '';
  }

  let text = await converse();
  let bad = unsupportedClaims(text, evidence);
  if (bad.length) {
    usage.retried = true;
    usage.flagged = bad.length;
    messages.push({ role: 'assistant', content: text });
    messages.push({
      role: 'user',
      content: `[Check] These figures aren't in any lookup this turn or in what I said: ${bad.map((b) => b.text).join(', ')}. Rewrite your answer without them, or look them up first. Don't mention this check.`,
    });
    text = await converse();
    bad = unsupportedClaims(text, evidence);
    if (bad.length) text = dropSentences(text, bad);
  }
  text = tidy(text, actions.length > 0);
  if (!text) {
    text = "I couldn't back that up with our data. Try asking about one state and species, or check with the state agency.";
  }
  return { text, sources: [...sources.values()], actions, removed: bad, usage };
}
