'use client';

// Permanent hunter preferences + point balances. Everything is optional.
// Season-specific answers (dates, this year's goals) stay on each search.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ALL_SPECIES, FITNESS_LEVELS, SPECIES, STATES, STYLE_OPTIONS, EXPERIENCE_OPTIONS } from '../planner/constants';
import { Button, Card, Caveat, Eyebrow } from '../ui';
import { ThemeToggle } from '../ui/client';

type PointRow = { state: string; species: string; points: number; as_of_year: number; verified_on: string | null };

function Chips({ options, value, onChange, name }: { options: string[]; value: string[]; onChange: (v: string[]) => void; name: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={name}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="hq-chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfileForm({ email, profile, points: initialPoints }: { email: string | null; profile: any; points: PointRow[] }) {
  const [p, setP] = useState({
    display_name: profile.display_name ?? '',
    home_state: profile.home_state ?? '',
    species_interests: profile.species_interests ?? [],
    weapons: profile.weapons ?? [],
    hunt_styles: profile.hunt_styles ?? [],
    fitness: profile.fitness ?? '',
    experience: profile.experience ?? '',
    grizzly_ok: profile.grizzly_ok ?? null,
    access_notes: profile.access_notes ?? '',
    typical_budget: profile.typical_budget ?? '',
  });
  const [points, setPoints] = useState<PointRow[]>(initialPoints);
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  const save = async () => {
    setBusy(true); setStatus(null);
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: p, points }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Could not save.');
      setStatus({ kind: 'info', text: 'Saved.' });
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const manageBilling = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.url) window.location.href = j.url;
    else setStatus({ kind: 'error', text: j.error || 'Could not open billing.' });
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Eyebrow>Your profile</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>Me</h1>
        <p className="hq-body" style={{ marginTop: 6 }}>Saved preferences fill in your searches. Everything is optional and you can change it per search.</p>
      </div>

      <Card aria-labelledby="about-h">
        <h2 id="about-h" className="hq-h3" style={{ marginBottom: 14 }}>About you</h2>
        <div className="hq-fields" style={{ gap: 16 }}>
          <label className="hq-field"><span className="hq-label">Name</span><input id="dn" className="hq-input" value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></label>
          <label className="hq-field">
            <span className="hq-label">Home state (residency)</span>
            <input id="hs" className="hq-input" maxLength={2} placeholder="e.g. WY" value={p.home_state} onChange={(e) => setP({ ...p, home_state: e.target.value.toUpperCase() })} />
          </label>
          <div className="hq-field hq-span"><span className="hq-label">Species you hunt</span><Chips name="Species" options={ALL_SPECIES} value={p.species_interests} onChange={(v) => setP({ ...p, species_interests: v })} /></div>
          <div className="hq-field hq-span"><span className="hq-label">Weapons</span><Chips name="Weapons" options={['Rifle', 'Archery', 'Muzzleloader']} value={p.weapons} onChange={(v) => setP({ ...p, weapons: v })} /></div>
          <div className="hq-field hq-span"><span className="hq-label">Hunt styles</span><Chips name="Hunt styles" options={STYLE_OPTIONS} value={p.hunt_styles} onChange={(v) => setP({ ...p, hunt_styles: v })} /></div>
          <label className="hq-field">
            <span className="hq-label">Fitness</span>
            <select id="fit" className="hq-input" value={p.fitness} onChange={(e) => setP({ ...p, fitness: e.target.value })}>
              <option value="">—</option>{FITNESS_LEVELS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="hq-field">
            <span className="hq-label">Experience</span>
            <select id="exp" className="hq-input" value={p.experience} onChange={(e) => setP({ ...p, experience: e.target.value })}>
              <option value="">—</option>{EXPERIENCE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="hq-field">
            <span className="hq-label">Grizzly country</span>
            <select id="griz" className="hq-input" value={p.grizzly_ok === null ? '' : p.grizzly_ok ? 'yes' : 'no'} onChange={(e) => setP({ ...p, grizzly_ok: e.target.value === '' ? null : e.target.value === 'yes' })}>
              <option value="">No preference</option><option value="yes">Comfortable</option><option value="no">Avoid</option>
            </select>
          </label>
          <label className="hq-field"><span className="hq-label">Typical budget</span><input id="bud" className="hq-input" placeholder="e.g. $3,000 per hunt" value={p.typical_budget} onChange={(e) => setP({ ...p, typical_budget: e.target.value })} /></label>
          <label className="hq-field hq-span"><span className="hq-label">Access limitations</span><textarea id="acc" rows={2} className="hq-input" placeholder="e.g. bad knee — no steep pack-outs" value={p.access_notes} onChange={(e) => setP({ ...p, access_notes: e.target.value })} /></label>
        </div>
      </Card>

      <Card aria-labelledby="pts-h">
        <h2 id="pts-h" className="hq-h3">Your points</h2>
        <p className="hq-small" style={{ marginTop: 4 }}>Enter balances as your state account shows them. HuntQuarters doesn&apos;t check them with the state, so note when you last verified.</p>
        {points.length > 0 && (
          <ul className="hq-stack" style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, gap: 10 }}>
            {points.map((r, i) => (
              <li key={i} className="hq-inset">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, alignItems: 'end' }}>
                  <label className="hq-field"><span className="hq-label">State</span>
                    <select className="hq-input" value={r.state} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, state: e.target.value } : x))}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label className="hq-field"><span className="hq-label">Species</span>
                    <select className="hq-input" value={r.species} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, species: e.target.value } : x))}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label className="hq-field"><span className="hq-label">Points</span>
                    <input type="number" min={0} step="any" className="hq-input" value={r.points} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, points: Math.max(0, Number(e.target.value) || 0) } : x))} /></label>
                  <label className="hq-field"><span className="hq-label">Last verified</span>
                    <input type="date" className="hq-input" value={r.verified_on ?? ''} onChange={(e) => setPoints(points.map((x, j) => j === i ? { ...x, verified_on: e.target.value || null } : x))} /></label>
                  <div><Button size="sm" variant="ghost" aria-label={`Remove ${r.state} ${r.species} points`} onClick={() => setPoints(points.filter((_, j) => j !== i))}>Remove</Button></div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 14 }}>
          <Button variant="secondary" size="sm" onClick={() => setPoints([...points, { state: p.home_state && STATES.includes(p.home_state) ? p.home_state : 'WY', species: 'Elk', points: 0, as_of_year: year, verified_on: null }])}>
            <Plus size={16} aria-hidden="true" /> Add a point balance
          </Button>
        </div>
      </Card>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
        {status && status.kind === 'info' && <p role="status" className="hq-ok">{status.text}</p>}
      </div>
      {status && status.kind === 'error' && <Caveat tone="stop">{status.text}</Caveat>}

      <Card variant="flat" aria-labelledby="look-h">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 id="look-h" className="hq-h3">Appearance</h2>
            <p className="hq-small" style={{ marginTop: 2 }}>Match your device, or always light or dark.</p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      <section aria-label="Account" style={{ borderTop: '1px solid var(--divider)', paddingTop: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <span className="hq-small">Signed in as {email}</span>
        <button type="button" onClick={manageBilling} className="hq-link hq-small" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>Manage membership and billing</button>
      </section>
    </main>
  );
}
