'use client';

// Bring a hunter's spreadsheet into their plan: paste or upload, confirm
// which column is which, review what will be added (and what couldn't be
// read), then save. Nothing is saved until the hunter confirms.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload } from 'lucide-react';
import { FIELDS, FIELD_LABEL, guessMapping, parseImport, splitRows, type Field, type Mapping } from '@/lib/sheetImport';
import { KIND_LABEL } from '@/lib/calendar';
import { Button, Card, Caveat, Eyebrow } from '../../ui';

export default function ImportSheet() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => splitRows(text), [text]);
  const header = rows[0] ?? [];
  const map = mapping ?? guessMapping(header);
  const result = useMemo(() => (rows.length > 1 ? parseImport(rows, map) : null), [rows, map]);

  const load = (t: string) => { setText(t); setMapping(null); setError(null); };
  const setField = (f: Field, col: string) => {
    const next: Mapping = { ...map };
    if (col === '') delete next[f]; else next[f] = Number(col);
    setMapping(next);
  };

  const save = async () => {
    if (!result) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/calendar/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points: result.points, items: result.items }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'The import failed — try again.');
      router.push('/plan');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The import failed — try again.');
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/plan" className="hq-link hq-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}><ArrowLeft size={14} aria-hidden="true" /> Your plan</Link>
      <div>
        <Eyebrow>Import</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>Import your spreadsheet</h1>
        <p className="hq-body" style={{ marginTop: 6 }}>Copy the rows from Google Sheets or Excel (including the header row) and paste them here, or upload a CSV. Useful columns: state, species, points, unit or hunt code, the year you plan to hunt, and a type column (target, bucket list, OTC).</p>
      </div>

      <Card aria-labelledby="paste-h">
        <h2 id="paste-h" className="hq-sr">Paste or upload</h2>
        <label className="hq-field">
          <span className="hq-label">Paste here</span>
          <textarea id="sheet" rows={8} value={text} onChange={(e) => load(e.target.value)} placeholder={'State\tSpecies\tPoints\tUnit\tYear\tType\nWY\tElk\t5\t\t\t\nCO\tDeer\t3\t61\t2028\ttarget\nAK\tDall Sheep\t\t\t\tbucket list'}
            className="hq-input" style={{ width: '100%', fontFamily: 'var(--font-hqmono), ui-monospace, monospace', fontSize: 13, minHeight: 160 }} />
        </label>
        <label className="hq-file" style={{ marginTop: 12 }}>
          <Upload size={16} aria-hidden="true" /> Upload a CSV
          <input type="file" accept=".csv,text/csv,text/plain" className="hq-sr" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ''; }} />
        </label>
      </Card>

      {rows.length > 0 && (
        <Card aria-labelledby="map-h">
          <h2 id="map-h" className="hq-h3" style={{ marginBottom: 12 }}>Which column is which?</h2>
          <div className="hq-fields" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {FIELDS.map((f) => (
              <label key={f} className="hq-field">
                <span className="hq-label">{FIELD_LABEL[f]}{f === 'state' || f === 'species' ? ' (required)' : ''}</span>
                <select className="hq-input" value={map[f] ?? ''} onChange={(e) => setField(f, e.target.value)}>
                  <option value="">Not in my sheet</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
        </Card>
      )}

      {result && (
        <section className="hq-stack" aria-labelledby="preview-h">
          <h2 id="preview-h" className="hq-h2">What will be added</h2>
          {result.points.length > 0 && (
            <Card>
              <p className="hq-h3">{result.points.length} point balance{result.points.length === 1 ? '' : 's'}</p>
              <p className="hq-body" style={{ marginTop: 6, fontSize: 14 }}>{result.points.map((p) => `${p.state} ${p.species}: ${p.points}`).join(' · ')}</p>
              <p className="hq-small" style={{ marginTop: 8 }}>These replace any balance you already have for the same state and species.</p>
            </Card>
          )}
          {result.items.length > 0 && (
            <Card>
              <p className="hq-h3">{result.items.length} hunt{result.items.length === 1 ? '' : 's'} for your plan</p>
              <ul className="hq-list" style={{ marginTop: 6 }}>
                {result.items.map((i, n) => (
                  <li key={n} className="hq-body" style={{ fontSize: 14, padding: '8px 0' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{KIND_LABEL[i.kind]}</span> · {i.state} {i.species}{i.unit ? ` · ${i.unit}` : ''}{i.hunt_code ? ` · hunt ${i.hunt_code}` : ''} · {i.target_year ?? 'no year'}{i.notes ? ` — ${i.notes}` : ''}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {result.issues.length > 0 && (
            <Caveat tone="warn">
              <p style={{ fontWeight: 700 }}>{result.issues.length} {result.issues.length === 1 ? 'row needs' : 'rows need'} a look (not imported)</p>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{result.issues.map((x, n) => <li key={n}>Row {x.row}: {x.text}</li>)}</ul>
              <p className="hq-small" style={{ marginTop: 8 }}>Fix them in your sheet and paste again, or add them by hand on your plan.</p>
            </Caveat>
          )}
          {error && <Caveat tone="stop">{error}</Caveat>}
          <div>
            <Button disabled={busy || (!result.points.length && !result.items.length)} onClick={save}>
              {busy ? 'Saving…' : 'Add to my plan'}
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
