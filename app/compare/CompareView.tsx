'use client';

// Compare view: the recommendation and its tradeoff first, then the full
// side-by-side table. Hunts are added by state → species → hunt.

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { compareKey, MAX_COMPARE, type CompareColumn } from '@/lib/compare';
import { huntTitle, labelText } from '@/lib/huntName';
import { STATES, speciesFor } from '../planner/constants';
import { Button, Card, Caveat, EmptyState, Eyebrow, Tier } from '../ui';

export type YourNotes = { planned: string[]; reports: string[] };

// Table cells. Row labels stick to the left so they stay readable while the
// hunt columns scroll sideways on a phone.
const cell: CSSProperties = { textAlign: 'left', verticalAlign: 'top', padding: '12px 14px', borderTop: '1px solid var(--divider)', fontSize: 14 };
const rowHead: CSSProperties = { ...cell, position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)', width: 140, minWidth: 120, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' };

// The window is however many years the calendar covers, so the labels say the
// year rather than a hard-coded "5 years" the figures stopped matching when the
// calendar went to three.
const rowsFor = (years: number[]): Array<{ label: string; get: (c: CompareColumn) => string }> => {
  const last = years.length ? years[years.length - 1] : null;
  return [
  { label: 'Odds this season', get: (c) => c.oddsNow },
  { label: 'How reliable', get: (c) => c.reliability },
  {
    label: 'Likely to draw by',
    get: (c) =>
      !c.openToYou ? '—'
        : c.outlook.kind === 'otc' ? 'No draw'
        : c.likelyBy ? String(c.likelyBy)
        // Clearing the bar isn't drawing in a bonus or random state, so it is
        // said as what it is rather than printed as a date.
        : c.clearsBarIn ? `Points bar cleared in ${c.clearsBarIn}, then a lottery`
        : last ? `Not by ${last}` : 'Not published',
  },
  {
    label: last ? `Chance by ${last}` : 'Chance in the years ahead',
    get: (c) => (c.chanceBy5 == null ? '—' : c.chanceBy5 >= 99 ? 'Very likely' : c.chanceBy5 > 0 && c.chanceBy5 < 1 ? 'Under 1%' : `About ${Math.round(c.chanceBy5)}%`),
  },
  { label: 'Hunter success', get: (c) => c.hunterSuccess },
  { label: 'Public land', get: (c) => c.publicLand ?? 'Not available' },
  { label: 'Season', get: (c) => c.season ?? 'See the regulations' },
  { label: 'Weapon', get: (c) => c.weapon ?? 'See the regulations' },
  { label: 'Trophy', get: (c) => c.trophy },
  { label: 'Cost', get: (c) => c.cost },
  ];
};

function AddHunt({ keys }: { keys: string[] }) {
  const router = useRouter();
  const [state, setState] = useState('CO');
  const [species, setSpecies] = useState('Elk');
  const [options, setOptions] = useState<Array<{ code: string; unit: string; label: string | null; speciesKey: string }>>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    fetch(`/api/huntdata/options?state=${state}&species=${encodeURIComponent(species)}`).then((r) => r.json()).then((j) => { if (live) setOptions(j.hunts ?? []); }).catch(() => setOptions([]));
    return () => { live = false; };
  }, [state, species]);
  const shown = options.filter((o) => !q || `${o.code} ${o.unit} ${o.label ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const add = (o: { code: string; speciesKey: string }) => router.push(`/compare?h=${[...keys, compareKey(state, o.speciesKey, o.code)].map(encodeURIComponent).join(',')}`);
  if (keys.length >= MAX_COMPARE) return <p className="hq-small">Up to {MAX_COMPARE} hunts. Remove one to add another.</p>;
  return (
    <Card aria-labelledby="add-h">
      <h2 id="add-h" className="hq-h3" style={{ marginBottom: 12 }}>Add a hunt to compare</h2>
      <div className="hq-fields">
        <label className="hq-field"><span className="hq-label">State</span>
          <select className="hq-input" value={state} onChange={(e) => { setState(e.target.value); setSpecies(speciesFor(e.target.value)[0]); }}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="hq-field"><span className="hq-label">Species</span>
          <select className="hq-input" value={species} onChange={(e) => setSpecies(e.target.value)}>{speciesFor(state).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="hq-field hq-span"><span className="hq-label">Search hunts</span>
          <input className="hq-input" placeholder="Unit, hunt code or name" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </div>
      <div className="hq-inset" style={{ marginTop: 12, padding: '0 12px', maxHeight: 240, overflowY: 'auto' }}>
        <ul className="hq-list">
          {shown.length === 0 && <li className="hq-small" style={{ padding: '12px 2px' }}>No hunts match.</li>}
          {shown.map((o) => (
            <li key={o.code}>
              <button type="button" onClick={() => add(o)} className="hq-row" style={{ padding: '10px 2px' }}>
                <span className="hq-row__main">
                  <span className="hq-row__title">{huntTitle(o.unit, o.code)}</span>
                  {o.label && <span className="hq-row__sub">{labelText(o.label)}</span>}
                </span>
                <span className="hq-link hq-small" aria-hidden="true">Add</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default function CompareView({ cols, pick, notes, missing, years, homeState }: {
  cols: CompareColumn[]; pick: { key: string; why: string; tradeoff: string | null } | null;
  notes: Record<string, YourNotes>; missing: string[]; years: number[]; homeState: string | null;
}) {
  const [added, setAdded] = useState<Record<string, string>>({});
  const [land, setLand] = useState<Record<string, string>>({});
  const keys = cols.map((c) => c.key);
  // Public land is sampled from BLM land status — slow the first time, so it
  // fills in after the table shows.
  useEffect(() => {
    let live = true;
    for (const c of cols) {
      fetch(`/api/huntdata/public-land?state=${c.state}&species=${encodeURIComponent(c.species)}&unit=${encodeURIComponent(c.unit)}`)
        .then((r) => r.json())
        .then((j) => { if (live) setLand((l) => ({ ...l, [c.key]: j.publicPct != null ? `About ${j.publicPct}% (BLM land-status sample)` : 'Not available' })); })
        .catch(() => { if (live) setLand((l) => ({ ...l, [c.key]: 'Not available' })); });
    }
    return () => { live = false; };
  }, [cols]);
  const without = (k: string) => `/compare?h=${keys.filter((x) => x !== k).map(encodeURIComponent).join(',')}`;

  const addToCalendar = async (c: CompareColumn) => {
    const otc = c.outlook.kind === 'otc';
    const year = otc ? null : c.likelyBy && years.includes(c.likelyBy) ? c.likelyBy : null;
    const res = await fetch('/api/plan-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: otc ? 'otc' : year ? 'target' : 'bucket', state: c.state, species: c.species, unit: c.unit, hunt_code: c.huntCode, label: c.label, target_year: year }),
    });
    setAdded((a) => ({ ...a, [c.key]: res.ok ? `Added${year ? ` for ${year}` : otc ? ' as an OTC option' : ' to your bucket list'}` : 'Could not add — try again' }));
  };

  const isPick = (c: CompareColumn) => pick?.key === c.key && cols.length > 1;
  const tint = (c: CompareColumn) => (isPick(c) ? 'var(--surface-sunk)' : undefined);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Eyebrow>Find</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>{cols.length === 1 ? 'This hunt' : 'Compare hunts'}</h1>
        <p className="hq-body" style={{ marginTop: 6 }}>
          {cols.length === 1 ? 'Everything we have on it' : 'Side by side'}, at your points{homeState ? ` (home state ${homeState})` : <> — set your home state in <Link href="/profile" className="hq-link">Me</Link> for resident odds</>}.
        </p>
      </div>

      <Caveat>Numbers are last year&apos;s published results, not a forecast. Confirm with the agency before you apply.</Caveat>

      {missing.length > 0 && <Caveat tone="warn">Couldn&apos;t find {missing.join(', ')} in our data.</Caveat>}

      {pick && cols.length > 1 && (
        <Card aria-labelledby="pick-h" className="hq-fade-up">
          <Eyebrow>Our pick</Eyebrow>
          <h2 id="pick-h" className="hq-h3" style={{ marginTop: 6 }}>{pick.why}</h2>
          <div className="hq-stack" style={{ gap: 8, marginTop: 10 }}>
            {pick.tradeoff && <p className="hq-body">Tradeoff: {pick.tradeoff}</p>}
            {(() => {
              // Public land arrives after the table: flag a much more public alternative.
              const pct = (k: string) => { const m = (land[k] ?? '').match(/About (\d+)%/); return m ? Number(m[1]) : null; };
              const mine = pct(pick.key);
              const alt = cols.filter((c) => c.key !== pick.key && c.openToYou).map((c) => ({ c, p: pct(c.key) }))
                .filter((x) => x.p != null && mine != null && x.p >= mine + 25).sort((a, b) => b.p! - a.p!)[0];
              return alt ? <p className="hq-body">Public land: {alt.c.state} {alt.c.huntCode} is about {alt.p}% public vs about {mine}% for our pick. Worth it if you hunt without private access.</p> : null;
            })()}
            <p className="hq-small">
              Weighs your chance of drawing {years.length ? `by ${years[years.length - 1]}` : 'in the years ahead'} against
              hunter success. Trophy quality and cost aren&apos;t in our data yet.
            </p>
          </div>
        </Card>
      )}

      {cols.length === 0 ? (
        <Card variant="flat">
          <EmptyState icon={<Scale size={22} />} title="Nothing to compare yet"
            text={<>Pick hunts below, or use &quot;Compare&quot; from your plan or Find.</>} />
        </Card>
      ) : (
        // Scrolls sideways inside its own box at phone width, never the page.
        <div className="hq-card" role="region" aria-label="Hunt comparison" tabIndex={0} style={{ padding: 0, overflowX: 'auto', maxWidth: '100%' }}>
          <table style={{ width: '100%', minWidth: 140 + cols.length * 190, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...rowHead, borderTop: 0 }}><span className="hq-sr">Hunt</span></th>
                {cols.map((c) => (
                  <th key={c.key} scope="col" style={{ ...cell, borderTop: 0, fontWeight: 400, background: tint(c) }}>
                    {isPick(c) && <p className="hq-eyebrow" style={{ marginBottom: 4 }}>Our pick</p>}
                    <p className="hq-h3">{c.state} {c.species.toLowerCase()}</p>
                    <p className="hq-small" style={{ fontWeight: 600 }}><Link href={`/hunt/${encodeURIComponent(c.key)}`} className="hq-link">{huntTitle(c.unit, c.huntCode)}</Link></p>
                    {c.label && <p className="hq-small">{labelText(c.label)}</p>}
                    {!c.openToYou && <p style={{ marginTop: 6 }}><Tier tier="stop" /></p>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsFor(years).map((r) => (
                <tr key={r.label}>
                  <th scope="row" style={rowHead}>{r.label}</th>
                  {cols.map((c) => <td key={c.key} style={{ ...cell, color: 'var(--ink)', background: tint(c) }}>{r.label === 'Public land' ? (land[c.key] ?? 'Checking…') : r.get(c)}</td>)}
                </tr>
              ))}
              <tr>
                <th scope="row" style={rowHead}>Your notes</th>
                {cols.map((c) => {
                  const n = notes[c.key];
                  const lines = [...(n?.planned ?? []), ...(n?.reports ?? [])];
                  return <td key={c.key} className="hq-small" style={{ ...cell, fontSize: 13, background: tint(c) }}>{lines.length ? lines.map((l, i) => <p key={i}>{l}</p>) : '—'}</td>;
                })}
              </tr>
              <tr>
                <th scope="row" style={rowHead}><span className="hq-sr">Actions</span></th>
                {cols.map((c) => (
                  <td key={c.key} style={{ ...cell, background: tint(c) }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                      {added[c.key]
                        ? <p className={added[c.key].startsWith('Added') ? 'hq-ok' : 'hq-err'} role="status">{added[c.key]} · <Link href="/plan" className="hq-link">See plan</Link></p>
                        : c.openToYou && <Button size="sm" onClick={() => addToCalendar(c)}>Add to plan</Button>}
                      <Link href={without(c.key)} className="hq-link hq-small">Remove</Link>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AddHunt keys={keys} />
    </main>
  );
}
