'use client';

// Plan: one timeline — this season, the years ahead, someday, and past
// seasons — plus points. Leads with what to decide this season.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, CalendarPlus, Sparkles, Mountain } from 'lucide-react';
import { Button, ButtonLink, Card, Caveat, EmptyState, Eyebrow, PointsTimeline, StatRow, Tier } from '../ui';
import { STAGE } from '@/lib/myHunts';
import { huntTitle } from '@/lib/huntName';
import { KIND_LABEL, PLAN_KINDS, type PlanKind } from '@/lib/calendar';
import { STATES, speciesFor } from '../planner/constants';
import type { PlanHunt, PointsRow } from './load';

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Something went wrong — try again.');
  return j;
}

// Utah names hunts after their units ("Monroe"), so don't say it twice.
const titleOf = (h: PlanHunt) => {
  const code = h.huntCode && h.unit && h.huntCode.toLowerCase() === h.unit.toLowerCase() ? null : h.huntCode;
  return `${h.species}${h.unit || code ? ` · ${huntTitle(h.unit ?? code!, h.unit ? code : null)}` : ''}`;
};
const subOf = (h: PlanHunt) => {
  if (h.short) return [h.short.text, h.due].filter(Boolean).join(' · ');
  if (h.due) return h.due;
  if (h.stage === 'reported' || h.stage === 'hunted') return h.harvested ? 'Harvested' : h.harvested === false ? 'No harvest' : STAGE[h.stage].label;
  return h.label ?? h.huntLabel ?? (h.bucket ? 'Bucket list' : h.otc ? 'OTC option' : '');
};

function Row({ h, years, thisYear, onError }: { h: PlanHunt; years: number[]; thisYear: number; onError: (e: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); router.refresh(); } catch (e) { onError(e instanceof Error ? e.message : 'Something went wrong.'); } finally { setBusy(false); }
  };
  const inner = (
    <>
      <span className="hq-badge">{h.state}</span>
      <span className="hq-row__main">
        <span className="hq-row__title">{titleOf(h)}</span>
        <span className="hq-row__sub">{subOf(h)}</span>
      </span>
      <Tier tier={h.stage === 'planned' && h.short ? h.short.tier : STAGE[h.stage].tier}>{h.otc && h.stage === 'planned' ? 'OTC' : STAGE[h.stage].label}</Tier>
    </>
  );

  // Hunts already in the application workflow open their own page.
  if (h.savedId) {
    return <li><Link href={`/season/${h.savedId}`} className="hq-row">{inner}<ChevronRight size={18} className="hq-row__chev" aria-hidden="true" /></Link></li>;
  }
  return (
    <li>
      <button type="button" className="hq-row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {inner}<ChevronDown size={18} className="hq-row__chev" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="hq-more hq-fade-up">
          {h.outlook && h.outlook.kind !== 'none' && <p className="hq-small" style={{ color: 'var(--ink-soft)' }}>{h.outlook.text}</p>}
          {h.notes && <p className="hq-small">“{h.notes}”</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="hq-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Year
              <select className="hq-input" style={{ minHeight: 34 }} disabled={busy} value={h.year ?? ''}
                onChange={(e) => act(() => send(`/api/plan-items/${h.planItemId}`, 'PATCH', { target_year: e.target.value || null }))}>
                <option value="">Someday</option>
                {[...new Set([...years, ...(h.year ? [h.year] : [])])].sort().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            {h.year === thisYear && (h.unit || h.huntCode) && (
              <Button size="sm" disabled={busy} onClick={() => act(() => send(`/api/plan-items/${h.planItemId}/to-season`, 'POST'))}>Start application</Button>
            )}
            {h.compareKey && <ButtonLink href={`/compare?h=${encodeURIComponent(h.compareKey)}`} variant="secondary" size="sm">Compare</ButtonLink>}
            <Button size="sm" variant="ghost" disabled={busy}
              onClick={() => window.confirm('Remove this from your plan?') && act(() => send(`/api/plan-items/${h.planItemId}`, 'DELETE'))}>Remove</Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function AddHunt({ years, onDone, onCancel, bare }: { years: number[]; onDone: () => void; onCancel?: () => void; bare?: boolean }) {
  const [f, setF] = useState({ kind: 'target' as PlanKind, state: 'CO', species: 'Elk', unit: '', hunt_code: '', target_year: String(years[0]), notes: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true); setError(null);
    try { await send('/api/plan-items', 'POST', { ...f, target_year: f.target_year || null }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not add it.'); }
    finally { setBusy(false); }
  };
  return (
    <Card className="hq-fade-up" style={bare ? { padding: 0, border: 0, background: 'none', boxShadow: 'none' } : undefined}>
      {!bare && <p className="hq-h3" style={{ marginBottom: 12 }}>Add a hunt to your plan</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }} role="group" aria-label="Type">
        {PLAN_KINDS.map((k) => <button key={k} type="button" className="hq-chip" aria-pressed={f.kind === k} onClick={() => set('kind', k)}>{KIND_LABEL[k]}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        <label className="hq-field"><span className="hq-label">State</span>
          <select className="hq-input" value={f.state} onChange={(e) => setF((x) => ({ ...x, state: e.target.value, species: speciesFor(e.target.value).includes(x.species) ? x.species : speciesFor(e.target.value)[0] }))}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="hq-field"><span className="hq-label">Species</span>
          <select className="hq-input" value={f.species} onChange={(e) => set('species', e.target.value)}>{speciesFor(f.state).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="hq-field"><span className="hq-label">Year</span>
          <select className="hq-input" value={f.target_year} onChange={(e) => set('target_year', e.target.value)}><option value="">Someday</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        <label className="hq-field"><span className="hq-label">Unit</span><input className="hq-input" placeholder="e.g. 61" value={f.unit} onChange={(e) => set('unit', e.target.value)} /></label>
        <label className="hq-field"><span className="hq-label">Hunt code</span><input className="hq-input" placeholder="Optional" value={f.hunt_code} onChange={(e) => set('hunt_code', e.target.value)} /></label>
        <label className="hq-field"><span className="hq-label">Notes</span><input className="hq-input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>
      {error && <div style={{ marginTop: 12 }}><Caveat tone="stop">{error}</Caveat></div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <Button disabled={busy} onClick={submit}>Add to plan</Button>
        <Button variant="ghost" onClick={onCancel ?? onDone}>Cancel</Button>
      </div>
      <p className="hq-small" style={{ marginTop: 10 }}>A hunt code gives exact odds. With only a unit, odds show when that unit has one hunt.</p>
    </Card>
  );
}

function PointsCard({ rows, years }: { rows: PointsRow[]; years: number[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ state: string; species: string; points: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = rows.filter((r) => r.usesPoints && r.live);
  const save = async () => {
    if (!edit) return;
    setError(null);
    try { await send('/api/points', 'PUT', { points: [{ ...edit, points: Number(edit.points) }] }); setEdit(null); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
  };
  return (
    <section id="points" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 className="hq-h2">Points</h2>
        <button type="button" className="hq-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setEdit({ state: 'CO', species: 'Elk', points: '' })}>Update points</button>
      </div>
      {edit && (
        <Card className="hq-fade-up">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="hq-field"><span className="hq-label">State</span>
              <select className="hq-input" value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value, species: speciesFor(e.target.value)[0] })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="hq-field"><span className="hq-label">Species</span>
              <select className="hq-input" value={edit.species} onChange={(e) => setEdit({ ...edit, species: e.target.value })}>{speciesFor(edit.state).map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="hq-field"><span className="hq-label">Points now</span>
              <input className="hq-input" inputMode="numeric" style={{ width: 90 }} value={edit.points} onChange={(e) => setEdit({ ...edit, points: e.target.value.replace(/[^\d]/g, '') })} /></label>
            <Button disabled={edit.points === ''} onClick={save}>Save</Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
          {error && <div style={{ marginTop: 10 }}><Caveat tone="stop">{error}</Caveat></div>}
        </Card>
      )}
      {shown.length === 0 ? (
        <Card variant="flat"><EmptyState icon={<Sparkles size={22} />} title="No points on file yet" text="Add your point balances and we'll project them year by year." /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {shown.map((r) => (
            <Card key={`${r.state}|${r.species}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <p className="hq-h3">{r.state} {r.species.toLowerCase()}</p>
                <p className="hq-small"><span className="hq-data" style={{ fontWeight: 700 }}>{r.current ?? '?'}</span> now</p>
              </div>
              {r.byYear
                ? <PointsTimeline years={years} points={r.byYear} cutoff={r.cutoff} drawYear={r.drawYear} />
                : <button type="button" className="hq-link" style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} onClick={() => setEdit({ state: r.state, species: r.species, points: '' })}>Add your current points</button>}
            </Card>
          ))}
        </div>
      )}
      <p className="hq-small">Projections assume you apply or buy a point each year; a planned draw resets them the year after. Idaho, New Mexico and Alaska have no points.</p>
    </section>
  );
}

export default function PlanView({ thisYear, years, hunts, points, homeKnown, loadError }: {
  thisYear: number; years: number[]; hunts: PlanHunt[]; points: PointsRow[]; homeKnown: boolean; loadError: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = (h: PlanHunt) => h.stage !== 'passed';
  const thisSeason = hunts.filter((h) => h.year === thisYear && active(h));
  const ahead = years.filter((y) => y > thisYear);
  const someday = hunts.filter((h) => h.year == null);
  const pastYears = [...new Set(hunts.filter((h) => h.year != null && (h.year < thisYear || (h.year === thisYear && !active(h)))).map((h) => h.year!))].sort((a, b) => b - a);
  const planned = new Set(thisSeason.map((h) => `${h.state}|${h.species}`));
  const building = points.filter((r) => r.usesPoints && r.live && !planned.has(`${r.state}|${r.species}`));
  const rowProps = { years, thisYear, onError: setError };
  const empty = hunts.length === 0 && points.length === 0;
  // Your record, from what you've logged (the app doesn't check with the states).
  const count = (f: (h: PlanHunt) => boolean) => hunts.filter(f).length;
  const drew = count((h) => !h.otc && ['drew', 'prepping', 'hunted', 'reported'].includes(h.stage));
  const decided = drew + count((h) => h.stage === 'didnt');
  const huntedN = count((h) => h.stage === 'hunted' || h.stage === 'reported');
  const totals = decided + huntedN > 0 ? [
    { k: 'Draws', v: decided ? `${drew} of ${decided}` : '—', n: 'results you recorded' },
    { k: 'Hunts', v: huntedN, n: `${count((h) => h.stage === 'reported')} reported` },
    { k: 'Harvests', v: count((h) => h.harvested === true), n: huntedN ? `of ${huntedN} hunts` : undefined },
  ] : null;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Eyebrow>Your plan</Eyebrow>
          <h1 className="hq-h1" style={{ marginTop: 4 }}>Plan</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ButtonLink href="/calendar/setup" variant="secondary" size="sm">Get suggestions</ButtonLink>
          <Button size="sm" onClick={() => setAdding(true)}><CalendarPlus size={16} aria-hidden="true" /> Add a hunt</Button>
        </div>
      </div>

      {loadError && <Caveat tone="stop">Your plan couldn&apos;t be loaded just now. Nothing is lost — try again in a minute.</Caveat>}
      {!homeKnown && <Caveat tone="warn">Set your home state in <Link href="/profile" className="hq-link">My Profile</Link> — odds below assume you&apos;re a non-resident everywhere.</Caveat>}
      {error && <Caveat tone="stop">{error}</Caveat>}
      {adding && <AddHunt years={years} onDone={() => { setAdding(false); router.refresh(); }} />}

      {empty && !loadError ? (
        <Card>
          <EmptyState icon={<Mountain size={24} />} title="Let's build your next few seasons"
            text="Answer a few quick questions — what you hunt, where, your points, your bucket list — and we'll suggest hunts year by year from real draw results."
            action={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><ButtonLink href="/calendar/setup">Start planning</ButtonLink><ButtonLink href="/calendar/import" variant="secondary">Import a spreadsheet</ButtonLink></div>} />
        </Card>
      ) : (
        <>
          {/* This season leads: it's what there is to decide now. */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <Eyebrow>This season</Eyebrow>
                <h2 className="hq-h2" style={{ marginTop: 2 }}>{thisYear}</h2>
              </div>
              <span className="hq-small">{thisSeason.length} hunt{thisSeason.length === 1 ? '' : 's'}</span>
            </div>
            {thisSeason.length + building.length === 0 ? (
              <div className="hq-open" style={{ marginTop: 12 }}><span>Nothing planned for {thisYear} yet.</span><Button size="sm" variant="secondary" onClick={() => setAdding(true)}>Add a hunt</Button></div>
            ) : (
              <ul className="hq-list" style={{ marginTop: 8 }}>
                {thisSeason.map((h) => <Row key={h.key} h={h} {...rowProps} />)}
                {building.map((r) => (
                  <li key={`b|${r.state}|${r.species}`}>
                    <a href="#points" className="hq-row">
                      <span className="hq-badge">{r.state}</span>
                      <span className="hq-row__main"><span className="hq-row__title">{r.species} · keep building</span><span className="hq-row__sub">Buy a point or apply — {r.current ?? '?'} now</span></span>
                      <Tier tier="long">Points</Tier>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {ahead.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="hq-h2">Years ahead</h2>
              {ahead.map((y) => {
                const list = hunts.filter((h) => h.year === y && active(h));
                return (
                  <Card key={y} variant="flat" style={{ padding: '14px 18px' }}>
                    <p className="hq-eyebrow" style={{ marginBottom: 4 }}>{y}</p>
                    {list.length ? <ul className="hq-list">{list.map((h) => <Row key={h.key} h={h} {...rowProps} />)}</ul>
                      : <div className="hq-open" style={{ marginTop: 6 }}><span>Open — room for an OTC or bucket-list hunt.</span><Button size="sm" variant="ghost" onClick={() => setAdding(true)}>Add</Button></div>}
                  </Card>
                );
              })}
            </section>
          )}

          {someday.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="hq-h2">Someday</h2>
              <Card variant="flat" style={{ padding: '6px 18px' }}><ul className="hq-list">{someday.map((h) => <Row key={h.key} h={h} {...rowProps} />)}</ul></Card>
            </section>
          )}

          <PointsCard rows={points} years={years} />

          {pastYears.length > 0 && (
            <section id="past" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="hq-h2">Past seasons</h2>
              {totals && <StatRow items={totals} />}
              {pastYears.map((y) => (
                <Card key={y} variant="flat" style={{ padding: '14px 18px' }}>
                  <p className="hq-eyebrow" style={{ marginBottom: 4 }}>{y}</p>
                  <ul className="hq-list">{hunts.filter((h) => h.year === y && (y < thisYear || !active(h))).map((h) => <Row key={h.key} h={h} {...rowProps} />)}</ul>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
      <p className="hq-small">Odds are each state&apos;s last published results, not a forecast. Confirm rules and points with the agency before you apply.</p>
    </main>
  );
}
