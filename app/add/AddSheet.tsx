'use client';

// ＋ sheet: record a draw result, add a tag, update points, add a hunt to the
// plan, write a report, jot a note. Each opens in place and takes seconds.

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarPlus, ChevronDown, Dices, NotebookPen, PenLine, Tag, TrendingUp } from 'lucide-react';
import { Button, ButtonLink, Card, Caveat, Eyebrow } from '../ui';
import { huntTitle } from '@/lib/huntName';
import { AddHunt } from '../plan/PlanView';
import { STATES, speciesFor } from '../planner/constants';

export type AddAction = 'result' | 'tag' | 'points' | 'plan' | 'report' | 'note';
type Hunt = { id: string; state: string; species: string; unit: string | null; huntCode: string | null; year: number | null; stage: string };
type Pts = { state: string; species: string; current: number | null };

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Something went wrong — try again.');
  return j;
}
const nameOf = (h: Hunt) => `${h.state} ${h.species.toLowerCase()}${h.unit || h.huntCode ? ` · ${huntTitle(h.unit ?? h.huntCode!, h.unit ? h.huntCode : null)}` : ''}${h.year ? ` · ${h.year}` : ''}`;

function Done({ text, href, link }: { text: string; href?: string; link?: string }) {
  return (
    <div role="status" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <p className="hq-h3">{text}</p>
      {href && <Link href={href} className="hq-link">{link ?? 'Open it'}</Link>}
    </div>
  );
}

function Result({ hunts }: { hunts: Hunt[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, 'successful' | 'unsuccessful'>>({});
  const [error, setError] = useState<string | null>(null);
  if (!hunts.length) return <p className="hq-body">Nothing is waiting on a draw. Mark a hunt Applied on its page and it shows up here.</p>;
  const record = async (h: Hunt, r: 'successful' | 'unsuccessful') => {
    setBusy(h.id); setError(null);
    try { await send(`/api/hunts/${h.id}`, 'PATCH', { application_result: r }); setDone((d) => ({ ...d, [h.id]: r })); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(null); }
  };
  return (
    <ul className="hq-list">
      {hunts.map((h) => (
        <li key={h.id} style={{ padding: '12px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="hq-row__title" style={{ flex: '1 1 180px' }}>{nameOf(h)}</span>
          {done[h.id] ? (
            <span className="hq-small">{done[h.id] === 'successful' ? 'Drew — ' : "Didn't draw — "}<Link href={`/season/${h.id}`} className="hq-link">{done[h.id] === 'successful' ? 'start your hunt plan' : 'open it'}</Link></span>
          ) : (
            <span style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" disabled={!!busy} onClick={() => record(h, 'successful')}>Drew</Button>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => record(h, 'unsuccessful')}>Didn&apos;t draw</Button>
            </span>
          )}
        </li>
      ))}
      {error && <li style={{ paddingTop: 10 }}><Caveat tone="stop">{error}</Caveat></li>}
    </ul>
  );
}

function StateSpecies({ f, set }: { f: { state: string; species: string }; set: (p: Partial<{ state: string; species: string }>) => void }) {
  return (
    <>
      <label className="hq-field"><span className="hq-label">State</span>
        <select className="hq-input" value={f.state} onChange={(e) => set({ state: e.target.value, species: speciesFor(e.target.value).includes(f.species) ? f.species : speciesFor(e.target.value)[0] })}>
          {STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="hq-field"><span className="hq-label">Species</span>
        <select className="hq-input" value={f.species} onChange={(e) => set({ species: e.target.value })}>{speciesFor(f.state).map((s) => <option key={s}>{s}</option>)}</select></label>
    </>
  );
}
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 } as const;

function TagForm({ years, thisYear }: { years: number[]; thisYear: number }) {
  const router = useRouter();
  const [f, setF] = useState({ state: 'CO', species: 'Elk', year: String(thisYear), unit: '', huntCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  if (saved) return already ? <Done text="You already have this hunt — record the draw on its page." href={`/season/${saved}`} /> : <Done text="Tag added." href={`/season/${saved}`} link="Start your hunt plan" />;
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const j = await send('/api/hunts', 'POST', { state: f.state, species: f.species, unit: f.unit || f.huntCode, huntCode: f.huntCode || null, seasonYear: Number(f.year), status: 'tag_secured', source: 'has_tag' });
      setSaved(j.hunt?.id ?? null); setAlready(!!j.alreadySaved); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add it.'); }
    finally { setBusy(false); }
  };
  return (
    <>
      <div style={grid}>
        <StateSpecies f={f} set={set} />
        <label className="hq-field"><span className="hq-label">Season</span>
          <select className="hq-input" value={f.year} onChange={(e) => set({ year: e.target.value })}>{[thisYear - 1, ...years].map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
        <label className="hq-field"><span className="hq-label">Unit</span><input className="hq-input" placeholder="e.g. 61" value={f.unit} onChange={(e) => set({ unit: e.target.value })} /></label>
        <label className="hq-field"><span className="hq-label">Hunt code</span><input className="hq-input" placeholder="Optional" value={f.huntCode} onChange={(e) => set({ huntCode: e.target.value })} /></label>
      </div>
      {error && <div style={{ marginTop: 12 }}><Caveat tone="stop">{error}</Caveat></div>}
      <div style={{ marginTop: 14 }}><Button disabled={busy || !(f.unit || f.huntCode)} onClick={submit}>Add tag</Button></div>
      <p className="hq-small" style={{ marginTop: 10 }}>Drew it or bought it over the counter — either way it goes straight to Drew.</p>
    </>
  );
}

function PointsForm({ rows }: { rows: Pts[] }) {
  const router = useRouter();
  const first = rows[0];
  const [f, setF] = useState({ state: first?.state ?? 'CO', species: first?.species ?? 'Elk', points: first?.current != null ? String(first.current) : '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (p: Partial<typeof f>) => { setSaved(false); setF((x) => ({ ...x, ...p })); };
  const submit = async () => {
    setBusy(true); setError(null);
    try { await send('/api/points', 'PUT', { points: [{ state: f.state, species: f.species, points: Number(f.points) }] }); setSaved(true); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <>
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {rows.map((r) => (
            <button key={`${r.state}|${r.species}`} type="button" className="hq-chip" aria-pressed={f.state === r.state && f.species === r.species}
              onClick={() => set({ state: r.state, species: r.species, points: r.current != null ? String(r.current) : '' })}>{r.state} {r.species.toLowerCase()}</button>
          ))}
        </div>
      )}
      <div style={grid}>
        <StateSpecies f={f} set={set} />
        <label className="hq-field"><span className="hq-label">Points now</span>
          <input className="hq-input" inputMode="numeric" value={f.points} onChange={(e) => set({ points: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })} /></label>
      </div>
      {error && <div style={{ marginTop: 12 }}><Caveat tone="stop">{error}</Caveat></div>}
      <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Button disabled={busy || f.points === ''} onClick={submit}>Save points</Button>
        {saved && <span role="status" className="hq-small">Saved · <Link href="/plan#points" className="hq-link">see projections</Link></span>}
      </div>
    </>
  );
}

function NoteForm({ hunts }: { hunts: Hunt[] }) {
  const [id, setId] = useState(hunts[0]?.id ?? '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  if (!hunts.length) return <p className="hq-body">Notes go on a hunt you&apos;ve started. Start one from <Link href="/plan" className="hq-link">your plan</Link>.</p>;
  if (saved) return <Done text="Note saved." href={`/season/${saved}`} />;
  const submit = async () => {
    setBusy(true); setError(null);
    try { await send(`/api/hunts/${id}/notes`, 'POST', { body: text }); setSaved(id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <>
      <label className="hq-field" style={{ marginBottom: 10 }}><span className="hq-label">Hunt</span>
        <select className="hq-input" value={id} onChange={(e) => setId(e.target.value)}>{hunts.map((h) => <option key={h.id} value={h.id}>{nameOf(h)}</option>)}</select></label>
      <label className="hq-field"><span className="hq-label">Note</span>
        <textarea className="hq-input" rows={3} style={{ padding: 12 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Glassed 6 bulls off the north ridge at first light…" /></label>
      {error && <div style={{ marginTop: 12 }}><Caveat tone="stop">{error}</Caveat></div>}
      <div style={{ marginTop: 14 }}><Button disabled={busy || !text.trim()} onClick={submit}>Save note</Button></div>
    </>
  );
}

function ReportList({ hunts }: { hunts: Hunt[] }) {
  if (!hunts.length) return <p className="hq-body">Reports open once you have a tag. Record a draw or add a tag first.</p>;
  return (
    <ul className="hq-list">
      {hunts.map((h) => (
        <li key={h.id}><Link href={`/season/${h.id}#report`} className="hq-row">
          <span className="hq-row__main"><span className="hq-row__title">{nameOf(h)}</span></span>
          <ArrowRight size={16} className="hq-row__chev" aria-hidden="true" />
        </Link></li>
      ))}
    </ul>
  );
}

export default function AddSheet({ open: initial, years, thisYear, waiting, reportable, noteable, points, loadError }: {
  open: AddAction | null; years: number[]; thisYear: number; waiting: Hunt[]; reportable: Hunt[]; noteable: Hunt[]; points: Pts[]; loadError: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<AddAction | null>(initial);
  const [planAdded, setPlanAdded] = useState(false);
  const actions: Array<{ key: AddAction; icon: ReactNode; title: string; sub: string; body: ReactNode }> = [
    { key: 'result', icon: <Dices size={20} />, title: 'Record a draw result', sub: waiting.length ? `${waiting.length} waiting on a draw` : 'Nothing waiting', body: <Result hunts={waiting} /> },
    { key: 'tag', icon: <Tag size={20} />, title: 'Add a tag I drew or bought', sub: 'Goes straight to Drew', body: <TagForm years={years} thisYear={thisYear} /> },
    { key: 'points', icon: <TrendingUp size={20} />, title: 'Update points', sub: points.length ? points.map((p) => `${p.state} ${p.species.toLowerCase()} ${p.current ?? '?'}`).join(' · ') : 'Add your balances', body: <PointsForm rows={points} /> },
    {
      key: 'plan', icon: <CalendarPlus size={20} />, title: 'Add a hunt to my plan', sub: 'A draw target, OTC option or someday hunt',
      body: planAdded ? <Done text="Added to your plan." href="/plan" link="Open your plan" />
        : <AddHunt bare years={years} onDone={() => { setPlanAdded(true); router.refresh(); }} onCancel={() => setOpen(null)} />,
    },
    { key: 'report', icon: <PenLine size={20} />, title: 'Write a hunt report', sub: reportable.length ? `${reportable.length} hunt${reportable.length === 1 ? '' : 's'} with a tag` : 'Once you have a tag', body: <ReportList hunts={reportable} /> },
    { key: 'note', icon: <NotebookPen size={20} />, title: 'Add a note', sub: 'Scouting, a call with a biologist, anything', body: <NoteForm hunts={noteable} /> },
  ];

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Eyebrow>Quick add</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>What happened?</h1>
      </div>
      {loadError && <Caveat tone="stop">Some of your hunts couldn&apos;t be loaded just now. Try again in a minute.</Caveat>}
      <Card variant="flat" style={{ padding: '4px 18px' }}>
        <ul className="hq-list">
          {actions.map((a) => (
            <li key={a.key}>
              <button type="button" className="hq-row" aria-expanded={open === a.key} onClick={() => { setPlanAdded(false); setOpen((o) => (o === a.key ? null : a.key)); }}>
                <span className="hq-badge" aria-hidden="true">{a.icon}</span>
                <span className="hq-row__main"><span className="hq-row__title">{a.title}</span><span className="hq-row__sub">{a.sub}</span></span>
                <ChevronDown size={18} className="hq-row__chev" aria-hidden="true" style={{ transform: open === a.key ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {open === a.key && <div className="hq-more hq-fade-up" style={{ paddingBottom: 16 }}>{a.body}</div>}
            </li>
          ))}
        </ul>
      </Card>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ButtonLink href="/today" variant="ghost">Back to Today</ButtonLink>
      </div>
    </main>
  );
}
