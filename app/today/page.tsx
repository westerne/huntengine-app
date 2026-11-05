import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CalendarCheck, Compass, Sparkles } from 'lucide-react';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { buildToday, daysBetween, upcomingOpenDeadlines, whenText, type TodayItem, type TodayTask } from '@/lib/today';
import { sortOpenTasks } from '@/lib/applications';
import Todo, { type TodoTask } from './Todo';
import { deadlineFor, shortDate } from '@/lib/huntdata/apply';
import { speciesKeyOf } from '@/lib/species';
import { BigNumber, ButtonLink, Card, Caveat, EmptyState, Eyebrow, StatRow, Tier } from '../ui';
import { loadPlan } from '../plan/load';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Today | HuntQuarters' };

// Today: what needs doing now, from the hunter's real dates — posted
// deadlines, their own dates, open tasks, tags and reports owed.

const TODAY = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());

function Row({ i }: { i: TodayItem }) {
  return (
    <li>
      <Link href={i.href} className="hq-row">
        <span className="hq-badge" style={{ width: 52 }}>{i.date ? shortDate(i.date) : '—'}</span>
        <span className="hq-row__main"><span className="hq-row__title">{i.title}</span><span className="hq-row__sub">{i.sub}</span></span>
        <ArrowRight size={16} className="hq-row__chev" aria-hidden="true" />
      </Link>
    </li>
  );
}

function List({ title, items }: { title: string; items: TodayItem[] }) {
  if (!items.length) return null;
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 className="hq-h2">{title}</h2>
      <Card variant="flat" style={{ padding: '4px 18px' }}><ul className="hq-list">{items.map((i) => <Row key={i.key} i={i} />)}</ul></Card>
    </section>
  );
}

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const { welcome } = await searchParams;
  const supabase = await supabaseServer();
  const [plan, { data: taskRows }] = await Promise.all([
    loadPlan(supabase, viewer.userId),
    supabase.from('tasks').select('id, title, due_on, kind, hunt_id, done_at, position, saved_hunts(status, state, species)').is('done_at', null),
  ]);
  const today = TODAY();
  type Row = TodayTask & { position: number; saved_hunts?: { status?: string; state?: string; species?: string } | null };
  const tasks = sortOpenTasks(((taskRows ?? []) as Row[]).filter((t) => t.saved_hunts?.status !== 'archived'));
  // The whole list lives in To-do; only what's overdue or due this week also
  // competes for the headline.
  const urgent = tasks.filter((x) => x.due_on && daysBetween(today, x.due_on) <= 7);
  const t = buildToday(plan.hunts, urgent, today);
  const todo: TodoTask[] = tasks.map((x) => ({
    id: x.id, title: x.title, due_on: x.due_on, kind: x.kind, hunt_id: x.hunt_id, done_at: null,
    hunt: x.saved_hunts?.state ? `${x.saved_hunts.state} ${x.saved_hunts.species?.toLowerCase() ?? ''}`.trim() : null,
  }));

  // Posted deadlines in states where they hold points but planned nothing this season.
  const planned = new Set(plan.hunts.filter((h) => h.year === plan.thisYear).map((h) => `${h.state}|${speciesKeyOf(h.species, h.state)}`));
  const res = (st: string) => (plan.home && plan.home === st ? 'resident' : 'nonresident') as 'resident' | 'nonresident';
  const open = upcomingOpenDeadlines(
    plan.points.filter((p) => p.live && !planned.has(`${p.state}|${speciesKeyOf(p.species, p.state)}`))
      .map((p) => ({ state: p.state, species: p.species, deadline: deadlineFor(p.state, speciesKeyOf(p.species, p.state), res(p.state), plan.thisYear) })),
    today,
  ).slice(0, 4);

  const nextHunt = plan.hunts.filter((h) => ['drew', 'prepping'].includes(h.stage) && h.huntStart && h.huntStart >= today).sort((a, b) => (a.huntStart! < b.huntStart! ? -1 : 1))[0];
  // Not posted yet: last year's date for each planned application, labeled, so they can plan around it.
  const expected = plan.hunts
    .filter((h) => h.year === plan.thisYear && h.agencyDeadline && h.agencyDeadline.kind !== 'published' && ['considering', 'planned', 'points'].includes(h.stage))
    .sort((a, b) => (a.agencyDeadline!.date.slice(5) < b.agencyDeadline!.date.slice(5) ? -1 : 1));
  const nothing = !t.lead && !t.thisWeek.length && !t.comingUp.length && !t.waiting.length && !open.length && !expected.length && !todo.length;
  const ptsShown = plan.points.filter((p) => p.usesPoints && p.live && p.current != null).slice(0, 3);
  const dateLine = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="hq" style={{ minHeight: '100vh' }}>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Eyebrow>{dateLine}</Eyebrow>
          <h1 className="hq-h1" style={{ marginTop: 4 }}>Today</h1>
        </div>
        {welcome && <Caveat tone="info">Welcome to HuntQuarters. Your membership is active — start with <Link href="/calendar/setup" className="hq-link">a few questions</Link> and we&apos;ll lay out your next seasons.</Caveat>}
        {plan.loadError && <Caveat tone="stop">Some of your plan couldn&apos;t be loaded just now. Nothing is lost — try again in a minute.</Caveat>}

        {t.lead ? (
          <Card className="hq-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Eyebrow>Most urgent</Eyebrow>
                <h2 className="hq-h2" style={{ marginTop: 4 }}>{t.lead.title}</h2>
                <p className="hq-body" style={{ marginTop: 4 }}>{t.lead.sub}</p>
              </div>
              {t.lead.days != null && t.lead.days >= 0 && (
                <BigNumber value={t.lead.days === 0 ? 'Today' : t.lead.days} unit={t.lead.days > 0 ? (t.lead.days === 1 ? ' day' : ' days') : undefined} sub={t.lead.date ? shortDate(t.lead.date) : undefined} />
              )}
              {t.lead.days != null && t.lead.days < 0 && <Tier tier="stop">Overdue</Tier>}
            </div>
            <div style={{ marginTop: 16 }}><ButtonLink href={t.lead.href}>Open it <ArrowRight size={16} aria-hidden="true" /></ButtonLink></div>
          </Card>
        ) : !nothing && (
          <Card variant="flat"><p className="hq-h3">Nothing urgent in the next two weeks.</p><p className="hq-small" style={{ marginTop: 4 }}>Here&apos;s what&apos;s ahead.</p></Card>
        )}

        {nothing && !plan.loadError && (
          <Card>
            <EmptyState icon={<Compass size={24} />} title="A quiet stretch"
              text="Nothing due and no tags in hand. Plan your next seasons or find a hunt — deadlines will show up here as states post them."
              action={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><ButtonLink href="/plan">Open your plan</ButtonLink><ButtonLink href="/find" variant="secondary">Find a hunt</ButtonLink></div>} />
          </Card>
        )}

        <List title="Next two weeks" items={t.thisWeek} />

        {nextHunt && !t.lead?.key.startsWith('h:') && (
          <Card variant="brand">
            <Eyebrow>Next hunt</Eyebrow>
            <p className="hq-h2" style={{ marginTop: 4 }}>{nextHunt.state} {nextHunt.species.toLowerCase()} · {whenText(Math.round((Date.parse(nextHunt.huntStart!) - Date.parse(today)) / 86400000))}</p>
            <p className="hq-small" style={{ marginTop: 4 }}>Opens {shortDate(nextHunt.huntStart!)}</p>
          </Card>
        )}

        <Todo initial={todo} />

        <List title="Coming up" items={t.comingUp} />
        <List title="Waiting on" items={t.waiting} />

        {open.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="hq-h2">Open now where you hold points</h2>
            <Card variant="flat" style={{ padding: '4px 18px' }}>
              <ul className="hq-list">
                {open.map((o) => (
                  <li key={`${o.state}|${o.species}`}>
                    <Link href="/plan" className="hq-row">
                      <span className="hq-badge">{o.state}</span>
                      <span className="hq-row__main"><span className="hq-row__title">{o.species} · {o.deadline!.name}</span><span className="hq-row__sub">Closes {shortDate(o.deadline!.date)} ({whenText(o.days)}) · nothing planned there yet</span></span>
                      <ArrowRight size={16} className="hq-row__chev" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        {expected.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="hq-h2">Expected this season</h2>
            <Card variant="flat" style={{ padding: '4px 18px' }}>
              <ul className="hq-list">
                {expected.map((h) => (
                  <li key={h.key}>
                    <Link href={h.savedId ? `/season/${h.savedId}` : '/plan'} className="hq-row">
                      <span className="hq-badge">{h.state}</span>
                      <span className="hq-row__main">
                        <span className="hq-row__title">{h.species}{h.huntCode ? ` · ${h.huntCode}` : ''}</span>
                        <span className="hq-row__sub">{h.agencyDeadline!.kind === 'expected' ? 'Expected' : 'Last year'} {shortDate(h.agencyDeadline!.date)} · not posted yet</span>
                      </span>
                      <ArrowRight size={16} className="hq-row__chev" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        <List title="Later this year" items={t.later.slice(0, 6)} />

        {ptsShown.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="hq-h2">Your points</h2>
              <Link href="/plan#points" className="hq-link">All points</Link>
            </div>
            <StatRow items={ptsShown.map((p) => ({ k: `${p.state} ${p.species}`, v: p.current ?? '?', n: 'points now' }))} />
          </section>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <ButtonLink href="/plan" variant="secondary"><CalendarCheck size={16} aria-hidden="true" /> Your plan</ButtonLink>
          <ButtonLink href="/calendar/setup" variant="ghost"><Sparkles size={16} aria-hidden="true" /> Get suggestions</ButtonLink>
        </div>
        <p className="hq-small">Countdowns use only dates each state has posted. Last year&apos;s dates are marked as such until the new ones are out. Confirm with the agency before you apply.</p>
      </main>
    </div>
  );
}
