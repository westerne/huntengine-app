'use client';

// Find, led by fit (docs/SPEC_RANKING.md): the hunter says what matters, we
// rank every hunt here against that, and only then say what each takes to
// draw. A cow tag or a crowded general hunt no longer leads just because it
// draws.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Card, Caveat } from '../ui';
import { Chip, Loader } from '../ui/client';
import { huntTitle, labelText } from '@/lib/huntName';
import { DEFAULT_PREFS, drawLine, type HuntPrefs, type RankedHunt, type Ranking, type Weight } from '@/lib/huntdata/fit';
import { AskButton } from '../components/Advisor';
import AddToPlan from './AddToPlan';

type Result = Ranking & { state: string; stateName: string; species: string; speciesKey: string; residency: string; points: number; earnsPoints: boolean; seasonYear: number };

const WEIGHT_WORDS: Record<Weight, string> = { 0: 'Doesn’t matter', 1: 'Nice', 2: 'Matters most' };
const CRITERIA: Array<{ key: 'success' | 'demand' | 'quiet'; label: string; help: string }> = [
  { key: 'success', label: 'Hunters fill their tags', help: 'hunter success' },
  { key: 'demand', label: 'Other hunters want it', help: 'applicants per tag; a sign of quality' },
  { key: 'quiet', label: 'Fewer hunters', help: 'fewest tags' },
];

function Weights({ value, onChange, label }: { value: Weight; onChange: (w: Weight) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="hq-seg hq-seg--text">
      {([0, 1, 2] as Weight[]).map((w) => (
        <button key={w} type="button" aria-pressed={value === w} onClick={() => onChange(w)}>{WEIGHT_WORDS[w]}</button>
      ))}
    </div>
  );
}

function Row({ h, r }: { h: RankedHunt; r: Result }) {
  const key = `${r.state}~${r.speciesKey}~${h.huntCode}`;
  return (
    <li style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/hunt/${encodeURIComponent(key)}`} className="hq-row__title" style={{ textDecoration: 'none' }}>{huntTitle(h.unit, h.huntCode)}</Link>
          {h.label && <p className="hq-small" style={{ marginTop: 2 }}>{labelText(h.label)}</p>}
        </div>
        <span className="hq-fit" title="How well it matches what you said matters, against the other hunts here">
          <span className="hq-data">{h.fit}</span><span>fit</span>
        </span>
      </div>
      <p className="hq-small" style={{ color: 'var(--ink-soft)' }}>{[...h.reasons, ...(h.herd ? [`Herd: ${h.herd}`] : [])].join(' · ')}</p>
      {h.unknown.length > 0 && <p className="hq-small">{h.unknown.map((u, i) => (i ? u : u[0].toUpperCase() + u.slice(1))).join(' · ')}</p>}
      <p className="hq-small" style={{ color: 'var(--ink)', fontWeight: 600 }}>{drawLine(h, r.horizonYear)}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 2 }}>
        <Link href={`/hunt/${encodeURIComponent(key)}`} className="hq-link hq-small">Odds as points build</Link>
        <AskButton variant="ghost" question={`Should I apply for ${r.state} ${r.species.toLowerCase()} hunt ${h.huntCode} this year or keep building points?`}>Ask</AskButton>
        <AddToPlan target={{ state: r.state, species: r.species, unit: h.unit, huntCode: h.huntCode, label: h.label, year: h.draw.likelyBy ?? r.seasonYear }} />
      </div>
    </li>
  );
}

function Group({ title, sub, items, r }: { title: string; sub: string; items: RankedHunt[]; r: Result }) {
  if (!items.length) return null;
  return (
    <Card>
      <h3 className="hq-h3">{title}</h3>
      <p className="hq-small" style={{ marginTop: 2 }}>{sub}</p>
      <ul className="hq-list" style={{ marginTop: 4 }}>{items.map((h) => <Row key={h.huntCode} h={h} r={r} />)}</ul>
    </Card>
  );
}

export default function RankedView({ state, species }: { state: string; species: string }) {
  const [prefs, setPrefs] = useState<HuntPrefs | null>(null);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // Saved preferences first; the first visit opens the panel so they're seen.
  useEffect(() => {
    fetch('/api/huntdata/rank').then((r) => (r.ok ? r.json() : null))
      .then((j) => { setPrefs(j?.prefs ?? DEFAULT_PREFS); setOpen(!j?.saved); })
      .catch(() => { setPrefs(DEFAULT_PREFS); setOpen(true); });
  }, []);

  // Re-rank on any change, a moment after the last tap.
  useEffect(() => {
    if (!prefs) return;
    const n = ++seq.current;
    const t = setTimeout(() => {
      fetch('/api/huntdata/rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, species, prefs }) })
        .then(async (r) => {
          const j = await r.json();
          if (n !== seq.current) return;
          if (!r.ok) { setError(j.error || 'Could not rank these hunts.'); setResult(null); return; }
          setError(null); setResult(j);
        })
        .catch(() => { if (n === seq.current) setError('Could not rank these hunts.'); });
    }, 250);
    return () => clearTimeout(t);
  }, [prefs, state, species]);

  const set = (p: Partial<HuntPrefs>) => setPrefs((x) => (x ? { ...x, ...p } : x));
  const setW = (k: keyof HuntPrefs['weights'], w: Weight) => setPrefs((x) => (x ? { ...x, weights: { ...x.weights, [k]: w } } : x));
  const current = result && result.state === state && result.species === species ? result : null;
  const sp = species.toLowerCase();
  const summary = prefs && [
    prefs.weapon === 'any' ? 'Any weapon' : prefs.weapon[0].toUpperCase() + prefs.weapon.slice(1),
    prefs.timing ? (prefs.timing === 'rut' ? 'the rut' : `${prefs.timing} season`) : null,
    ...CRITERIA.filter((c) => prefs.weights[c.key] === 2).map((c) => c.label.toLowerCase()),
    `${prefs.horizon} years`,
  ].filter(Boolean).join(' · ');

  return (
    <section aria-labelledby="ranked-h" className="hq-stack hq-stack--lg">
      <h2 id="ranked-h" className="hq-h2">Best fits for you</h2>

      <Card variant="flat">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <p className="hq-h3">What matters to you</p>
            {!open && summary && <p className="hq-small" style={{ marginTop: 2 }}>{summary}</p>}
          </div>
          <button type="button" className="hq-btn hq-btn--secondary hq-btn--sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <SlidersHorizontal size={14} aria-hidden="true" /> {open ? 'Done' : 'Change'}
          </button>
        </div>
        {open && prefs && (
          <div className="hq-stack" style={{ gap: 16, marginTop: 16 }}>
            <div className="hq-field">
              <span className="hq-label">Weapon</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['any', 'rifle', 'archery', 'muzzleloader'] as const).map((w) => (
                  <Chip key={w} pressed={prefs.weapon === w} onClick={() => set({ weapon: w })}>{w === 'any' ? 'Any' : w[0].toUpperCase() + w.slice(1)}</Chip>
                ))}
              </div>
            </div>
            {CRITERIA.map((c) => (
              <div key={c.key} className="hq-field">
                <span className="hq-label">{c.label} <span className="hq-small" style={{ fontWeight: 400 }}>({c.help})</span></span>
                <Weights label={c.label} value={prefs.weights[c.key]} onChange={(w) => setW(c.key, w)} />
              </div>
            ))}
            <div className="hq-field">
              <span className="hq-label">When <span className="hq-small" style={{ fontWeight: 400 }}>(only where the state publishes season dates)</span></span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([null, 'rut', 'early', 'late'] as const).map((t) => (
                  <Chip key={String(t)} pressed={prefs.timing === t} onClick={() => setPrefs((x) => (x ? { ...x, timing: t, weights: { ...x.weights, timing: t ? 2 : 0 } } : x))}>
                    {t == null ? 'Any time' : t === 'rut' ? 'The rut' : `${t[0].toUpperCase()}${t.slice(1)} season`}
                  </Chip>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="hq-field">
                <span className="hq-label">Years you&apos;ll build points</span>
                <select className="hq-input" value={prefs.horizon} onChange={(e) => set({ horizon: Number(e.target.value) })}>
                  {[1, 3, 5, 8, 10, 15].map((y) => <option key={y} value={y}>{y === 1 ? 'This year only' : `${y} years`}</option>)}
                </select>
              </label>
              <Chip pressed={prefs.antlerless} onClick={() => set({ antlerless: !prefs.antlerless })}>Include antlerless</Chip>
            </div>
          </div>
        )}
      </Card>

      {error && <Caveat tone="stop">{error}</Caveat>}
      {!current && !error && <Loader lines={['Ranking the hunts', 'Checking your points', 'Lining up the odds']} />}

      {current && (
        <>
          <p className="hq-small">
            {current.considered} {sp} hunts ranked against each other for what you said matters
            {current.earnsPoints ? `, at your ${current.points} ${current.points === 1 ? 'point' : 'points'}` : ''} ({current.residency === 'resident' ? 'resident' : 'non-resident'}).
            {[current.hidden.antlerless && `${current.hidden.antlerless} antlerless`, current.hidden.weapon && `${current.hidden.weapon} other-weapon`, current.hidden.restricted && `${current.hidden.restricted} youth, private-land or restricted`].filter(Boolean).length > 0 &&
              ` Left out: ${[current.hidden.antlerless && `${current.hidden.antlerless} antlerless`, current.hidden.weapon && `${current.hidden.weapon} other-weapon`, current.hidden.restricted && `${current.hidden.restricted} youth, private-land or restricted`].filter(Boolean).join(', ')}.`}
          </p>

          {!current.drawNow.length && !current.building.length && current.longShots.length > 0 && (
            <Caveat tone="info">Nothing that fits what you asked for is likely by {current.horizonYear} at your points. Try a longer horizon, &ldquo;Nice&rdquo; instead of &ldquo;Matters most&rdquo;, or see everything by odds below.</Caveat>
          )}
          <Group title="Draw it now" sub="Good fits with at least a 1-in-5 chance this year." items={current.drawNow} r={current} />
          <Group title="Worth building toward" sub={`Good fits you're likely to draw by ${current.horizonYear} if you apply every year.`} items={current.building} r={current} />
          <Group title="Long shots" sub={`Great fits, but a small chance even by ${current.horizonYear}. Every application is still a chance.`} items={current.longShots} r={current} />
          <Group title="Ranked by fit" sub={`${current.stateName} publishes how each hunt drew overall, not by point level, so we can't say when you'd draw. The rate shown is the hunt's, not yours.`} items={current.unpriced} r={current} />

          {!current.drawNow.length && !current.building.length && !current.longShots.length && !current.unpriced.length && (
            <Card variant="flat">
              <p className="hq-h3">Nothing here fits what you asked for yet.</p>
              <p className="hq-small" style={{ marginTop: 4 }}>Try &ldquo;Nice&rdquo; instead of &ldquo;Matters most&rdquo;, another weapon, or a longer horizon.</p>
            </Card>
          )}
          <p className="hq-small">Trophy size, hunter density and access aren&apos;t in the ranking yet: we only rank on figures the states publish. <Link href="/compare" className="hq-link">Compare hunts <ArrowRight size={12} aria-hidden="true" /></Link></p>
        </>
      )}
    </section>
  );
}

