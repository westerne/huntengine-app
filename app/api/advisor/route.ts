import { NextResponse } from 'next/server';
import { requireMember } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { supabaseServer } from '@/lib/supabase/server';
import { costOf, openAIModel } from '@/lib/advisor/model';
import { runAdvisor, type Turn } from '@/lib/advisor/run';
import { makeToolbox } from '@/lib/advisor/toolbox';
import { situationFromPlan, type ReportRow } from '@/lib/advisor/situation';
import { suggestQuestions } from '@/lib/advisor/suggest';
import { factsOf, threadTitle } from '@/lib/advisor/facts';
import { loadPlan } from '@/app/plan/load';

export const maxDuration = 60;

// POST /api/advisor  { question, threadId?, history?: [{ role, content }] }
//
// With a threadId the history comes from the saved conversation; without one
// a new conversation is started (named after the question). The client's own
// history is only used if saving isn't available.
//
// One advisor turn. Streams newline-delimited JSON:
//   { type: 'thread', id }                            the conversation it's saved in
//   { type: 'status', text }                          while lookups run
//   { type: 'answer', text, sources, actions }        once, after the answer check
//   { type: 'error', error }
// The answer is only sent after it has been checked, so nothing unchecked is
// ever on screen; the status lines are what keep it from feeling stuck.

const MAX_QUESTION = 800;
const MAX_TURN = 2000;
const DAILY_GUARD = 200;
const TODAY = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());

function cleanHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Turn => !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
    .slice(-10)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_TURN) }));
}

// GET /api/advisor → { suggestions }: questions to offer on an empty sheet,
// picked from the hunter's own plan. No model call.
export async function GET() {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const supabase = await supabaseServer();
  const plan = await loadPlan(supabase, auth.viewer.userId!).catch(() => null);
  return NextResponse.json({ suggestions: suggestQuestions(plan && !plan.loadError ? plan : null) });
}

export async function POST(req: Request) {
  const auth = await requireMember();
  if ('error' in auth) return auth.error;
  const userId = auth.viewer.userId!;
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'The advisor is not set up on this server yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION) : '';
  if (question.length < 2) return NextResponse.json({ error: 'Ask a question.' }, { status: 400 });
  let history = cleanHistory(body?.history);

  const supabase = await supabaseServer();

  // No question limit — only a guard against runaway cost. The usage table is
  // the real count; if it isn't there yet, fall back to a per-instance one.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error: countErr } = await supabase.from('advisor_usage')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  const overGuard = countErr
    ? !checkRateLimit(`advisor:${userId}`, { max: DAILY_GUARD, windowMs: 86_400_000 }).allowed
    : (count ?? 0) >= DAILY_GUARD;
  if (overGuard) {
    return NextResponse.json({ error: "That's a lot of questions for one day. The advisor will be back tomorrow." }, { status: 429 });
  }

  // The saved conversation, or a new one. If saving isn't possible the turn
  // still runs; it just isn't kept.
  let threadId: string | null = typeof body?.threadId === 'string' ? body.threadId : null;
  if (threadId) {
    // Gone (deleted in another tab) means start a new one.
    const { data: t } = await supabase.from('advisor_threads').select('id').eq('id', threadId).maybeSingle();
    if (!t) threadId = null;
  }
  if (threadId) {
    const { data, error } = await supabase.from('advisor_messages').select('role, content').eq('thread_id', threadId).order('id', { ascending: false }).limit(10);
    if (error) threadId = null;
    else history = (data ?? []).reverse().map((m) => ({ role: m.role as Turn['role'], content: String(m.content).slice(0, MAX_TURN) }));
  }
  if (!threadId) {
    const { data } = await supabase.from('advisor_threads').insert({ user_id: userId, title: threadTitle(question) }).select('id').single();
    threadId = data?.id ?? null;
  }

  const [plan, { data: prof }] = await Promise.all([
    loadPlan(supabase, userId).catch(() => null),
    supabase.from('profiles').select('planning').eq('user_id', userId).maybeSingle(),
  ]);
  const facts = factsOf(prof?.planning).map((f) => f.text);
  const sit = situationFromPlan(plan ?? { thisYear: new Date().getFullYear(), years: [], home: null, hunts: [], points: [] });
  const today = TODAY();
  const tools = makeToolbox(sit, {
    today,
    plan: plan && !plan.loadError ? plan : null,
    reports: async () => {
      const { data, error } = await supabase.from('hunt_reports')
        .select('started_on, days_hunted, harvested, pressure, worked, didnt_work, change_next, completed_at, saved_hunts(state, species, season_year, unit, hunt_code)')
        .not('completed_at', 'is', null)
        .order('started_on', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });
  const model = openAIModel();

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
      if (threadId) send({ type: 'thread', id: threadId });
      try {
        const answer = await runAdvisor({
          model, tools, question, history,
          context: { today, seasonYear: sit.seasonYear, home: sit.home, facts },
          onStatus: (text) => send({ type: 'status', text }),
        });
        send({ type: 'answer', text: answer.text, sources: answer.sources, actions: answer.actions });
        if (threadId) {
          const { error: mErr } = await supabase.from('advisor_messages').insert([
            { thread_id: threadId, user_id: userId, role: 'user', content: question },
            { thread_id: threadId, user_id: userId, role: 'assistant', content: answer.text.slice(0, 4000), sources: answer.sources, actions: answer.actions },
          ]);
          if (mErr) console.warn('advisor messages not saved:', mErr.message);
          else await supabase.from('advisor_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
        }
        const u = answer.usage;
        const { error } = await supabase.from('advisor_usage').insert({
          user_id: userId, model: model.name,
          input_tokens: u.input, output_tokens: u.output, cost_usd: Number(costOf(model, u).toFixed(5)),
          model_calls: u.modelCalls, tool_calls: u.toolCalls, flagged: u.flagged, retried: u.retried,
        });
        if (error) console.warn('advisor usage not logged:', error.message);
      } catch (e) {
        console.error('advisor turn failed:', e);
        send({ type: 'error', error: 'The advisor hit a snag. Try again in a minute.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
  });
}
