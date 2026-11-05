import { describe, expect, it } from 'vitest';
import { dropSentences, runAdvisor, tidy, MAX_TOOL_CALLS } from '../advisor/run';
import { makeToolbox } from '../advisor/toolbox';
import { myReports, type ReportRow } from '../advisor/situation';
import { searchHunts, type Situation } from '../advisor/tools';
import { suggestQuestions } from '../advisor/suggest';
import type { AdvisorModel, ChatMessage, ModelTurn } from '../advisor/model';

const sit: Situation = {
  home: 'WY',
  balances: [{ state: 'NV', species: 'Elk', points: 6 }],
  years: [2027, 2028, 2029],
  seasonYear: 2027,
};
const context = { today: '2026-11-05', seasonYear: 2027, home: 'WY' };
const tools = makeToolbox(sit, { plan: null, reports: async () => [], today: '2026-11-05' });

// A stand-in model that plays back a script, one step per call, and records
// what it was sent.
function scripted(steps: Array<Partial<ModelTurn> | ((m: ChatMessage[]) => Partial<ModelTurn>)>) {
  const seen: ChatMessage[][] = [];
  let i = 0;
  const model: AdvisorModel = {
    name: 'scripted', price: { input: 0, output: 0 },
    async turn(messages) {
      seen.push([...messages]);
      const s = steps[Math.min(i++, steps.length - 1)];
      const t = typeof s === 'function' ? s(messages) : s;
      return { text: t.text ?? null, toolCalls: t.toolCalls ?? [], usage: { input: 10, output: 5 } };
    },
  };
  return { model, seen };
}
const call = (name: string, args: object, id = name) => ({ id, name, args: JSON.stringify(args) });

describe('advisor turn', () => {
  it('runs lookups, answers, and builds "Based on" from the lookups that ran', async () => {
    const { model } = scripted([
      { toolCalls: [call('get_hunt', { state: 'NV', species: 'Elk', huntCode: '4161-131' })] },
      (m) => {
        const hunt = JSON.parse((m[m.length - 1] as { content: string }).content);
        return { text: `Keep building.\nYou have ${hunt.yourPoints} points.` };
      },
    ]);
    const statuses: string[] = [];
    const a = await runAdvisor({ model, tools, question: 'Should I apply for 4161-131?', context, onStatus: (s) => statuses.push(s) });
    expect(a.text).toBe('Keep building.\nYou have 6 points.');
    expect(a.sources.map((s) => s.label).join(' | ')).toMatch(/Nevada draw results.*your NV elk points \(6\)/);
    expect(statuses).toEqual(['Looking up the hunt']);
    expect(a.usage).toMatchObject({ modelCalls: 2, toolCalls: 1, retried: false });
  });

  it('sends a made-up number back once, and takes the sentence out if it stays', async () => {
    const { model, seen } = scripted([
      { text: 'Apply now. Your odds are about 35%.' },
      { text: 'Apply now. Your odds are about 35%.' },
    ]);
    const a = await runAdvisor({ model, tools, question: 'Should I apply?', context });
    expect(seen[1][seen[1].length - 1].content).toMatch(/\[Check\].*35%/);
    expect(a.text).toBe('Apply now.');
    expect(a.removed.map((r) => r.text)).toEqual(['35%']);
    expect(a.usage.retried).toBe(true);
  });

  it('keeps the fixed answer when the retry looks the number up', async () => {
    const { model } = scripted([
      { text: 'Deadline is June 1.' },
      { toolCalls: [call('deadlines', { state: 'NV', species: 'Elk' })] },
      (m) => {
        const d = JSON.parse((m[m.length - 1] as { content: string }).content);
        return { text: `Deadline is ${d.dateText} (last year's date).` };
      },
    ]);
    const a = await runAdvisor({ model, tools, question: 'When is the NV elk deadline?', context });
    expect(a.removed).toEqual([]);
    expect(a.text).toMatch(/^Deadline is \w+ \d+/);
    expect(a.text).not.toMatch(/June 1\b/);
  });

  it("lets the hunter's own numbers through", async () => {
    const { model } = scripted([{ text: 'With $1,500 a year you can hold points in a few states.' }]);
    const a = await runAdvisor({ model, tools, question: 'I have $1,500 a year. Where should I buy points?', context });
    expect(a.usage.retried).toBe(false);
    expect(a.text).toMatch(/\$1,500/);
  });

  it('stops lookups after the limit and still answers', async () => {
    const many = Array.from({ length: MAX_TOOL_CALLS + 2 }, (_, i) => call('deadlines', { state: 'NV', species: 'Elk' }, `c${i}`));
    const { model, seen } = scripted([{ toolCalls: many }, { text: 'Here is what I found.' }]);
    const a = await runAdvisor({ model, tools, question: 'Deadlines?', context });
    expect(a.text).toBe('Here is what I found.');
    const last = seen[1];
    expect(last.filter((m) => m.role === 'tool' && /enough lookups/.test(m.content))).toHaveLength(2);
  });

  it('turns proposals into buttons, and drops a reminder date no lookup gave', async () => {
    const { model } = scripted([
      { toolCalls: [
        call('propose_add_to_plan', { state: 'Nevada', species: 'elk', kind: 'target', year: 2029, huntCode: '4161-131' }, 'a'),
        call('propose_reminder', { title: 'Buy NV elk point', dueOn: '2027-04-01', state: 'Nevada', species: 'Elk' }, 'b'),
      ] },
      { text: 'Tap the buttons below if you want them.' },
    ]);
    const a = await runAdvisor({ model, tools, question: 'Add it and remind me', context });
    expect(a.actions).toHaveLength(2);
    expect(a.actions[0]).toMatchObject({ kind: 'add_to_plan', item: { state: 'NV', species: 'Elk', target_year: 2029, hunt_code: '4161-131' } });
    expect(a.actions[1]).toMatchObject({ kind: 'reminder', task: { title: 'Buy NV elk point', due_on: null, state: 'NV' } });
  });

  it('says so plainly when nothing comes back', async () => {
    const { model } = scripted([{ text: '' }]);
    const a = await runAdvisor({ model, tools, question: 'Hi', context });
    expect(a.text).toMatch(/couldn't back that up/);
  });
});

describe('tidy', () => {
  it('unwraps markdown and drops a button nobody offered', () => {
    expect(tidy('Apply in **Idaho**. See [the site](https://idfg.idaho.gov). Tap the button to add it.', false))
      .toBe('Apply in Idaho. See the site.');
    expect(tidy('Tap the button to add it.', true)).toBe('Tap the button to add it.');
  });
  it('takes out a tool name typed instead of called', () => {
    expect(tidy('Check when Colorado posts its deer deadline.\n\nfunctions.propose_reminder', true)).toBe('Check when Colorado posts its deer deadline.');
  });
  it('puts a reminder under every deadline, undated when only last year\u2019s date is known', async () => {
    const r = await tools.call('deadlines', { state: 'NV', species: 'Elk' }, []);
    expect(r.action).toMatchObject({ kind: 'reminder' });
    if (r.result.ok && (r.result.data as { status: string }).status === 'last_year') {
      expect(r.action).toMatchObject({ task: { due_on: null, title: 'Check when NV posts its elk deadline' } });
    }
  });
  it('drops a reminder date that has already passed', async () => {
    const r = await tools.call('propose_reminder', { title: 'NV elk deadline', dueOn: '2026-05-13' }, ['2026-05-13']);
    expect(r.action).toMatchObject({ kind: 'reminder', task: { due_on: null } });
  });
});

describe('dropSentences', () => {
  it('removes only the sentences carrying a flagged claim, keeping lines', () => {
    expect(dropSentences('Keep building. Odds are 35%.\nNext: buy a point.', [{ text: '35%', kind: 'number' }]))
      .toBe('Keep building.\nNext: buy a point.');
  });
});

describe('search_hunts and my_reports', () => {
  it('reads what is within reach at the hunter’s points, with sources', () => {
    const r = searchHunts({ state: 'NV', species: 'Elk' }, sit);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.yourPoints).toBe(6);
    expect(r.data.reachable.length).toBeLessThanOrEqual(8);
    expect(r.sources.map((s) => s.label).join(' ')).toMatch(/Nevada draw results/);
  });

  it('returns only finished reports, and only the lessons', () => {
    const rows: ReportRow[] = [
      { started_on: '2025-10-01', days_hunted: 5, harvested: false, pressure: 'high', worked: 'glassing early', didnt_work: 'calling', change_next: 'go later', completed_at: '2025-10-20', saved_hunts: { state: 'NV', species: 'Elk', season_year: 2025, unit: '161', hunt_code: '4161-131' } },
      { started_on: '2024-10-01', days_hunted: 3, harvested: true, pressure: 'low', worked: null, didnt_work: null, change_next: null, completed_at: null, saved_hunts: { state: 'NV', species: 'Elk', season_year: 2024, unit: '161', hunt_code: '4161-131' } },
    ];
    const r = myReports(rows, { state: 'Nevada', species: 'elk' });
    expect(r.ok && r.data).toHaveLength(1);
    if (r.ok) expect(Object.keys(r.data[0])).not.toContain('sightings');
    expect(myReports(rows, { state: 'CO' }).ok).toBe(false);
  });
});

describe('suggested questions', () => {
  const base = { thisYear: 2027, years: [2027, 2028, 2029], home: 'WY' };
  const h = (o: Record<string, unknown>) => ({ year: 2027, stage: 'planned', otc: false, huntCode: null, state: 'NV', species: 'Elk', ...o }) as never;
  const pts = (o: Record<string, unknown>) => ({ usesPoints: true, live: true, byYear: null, cutoff: null, drawYear: null, ...o }) as never;

  it('gives everyday questions when there is no plan', () => {
    expect(suggestQuestions(null)).toHaveLength(4);
  });
  it('leads with a drawn tag, then the hunt they are aiming at, then idle points', () => {
    const q = suggestQuestions({
      ...base,
      hunts: [h({ state: 'WY', species: 'Deer', stage: 'drew' }), h({ huntCode: '4161-131', year: 2029 })],
      points: [pts({ state: 'NV', species: 'Elk', current: 6 }), pts({ state: 'UT', species: 'Deer', current: 12 })],
    });
    expect(q[0]).toBe('What should I do before opening day for my WY deer hunt?');
    expect(q[1]).toBe('Should I apply for NV elk 4161-131 or keep building points?');
    expect(q[2]).toBe('Where should I use my 12 UT deer points?');
    expect(q).toHaveLength(4);
  });
});
