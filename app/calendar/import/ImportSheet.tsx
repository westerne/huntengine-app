'use client';

// Bring a hunter's spreadsheet into My Hunt Calendar: paste or upload, confirm
// which column is which, review what will be added (and what couldn't be
// read), then save. Nothing is saved until the hunter confirms.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FIELDS, FIELD_LABEL, guessMapping, parseImport, splitRows, type Field, type Mapping } from '@/lib/sheetImport';
import { KIND_LABEL } from '@/lib/calendar';

const inputCls = 'bg-black border border-zinc-800 p-2 rounded-lg text-zinc-200 text-sm outline-none focus:border-amber-500';

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
      router.push('/calendar');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The import failed — try again.');
      setBusy(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <Link href="/calendar" className="text-zinc-500 text-[11px] font-black uppercase tracking-widest hover:text-white">← My Hunt Calendar</Link>
      <div>
        <h1 className="text-3xl font-black italic uppercase">Import your spreadsheet</h1>
        <p className="text-zinc-400 text-sm mt-2">Copy the rows from Google Sheets or Excel (including the header row) and paste them here, or upload a CSV. Useful columns: state, species, points, unit or hunt code, the year you plan to hunt, and a type column (target, bucket list, OTC).</p>
      </div>

      <section className="space-y-3" aria-labelledby="paste-h">
        <h2 id="paste-h" className="sr-only">Paste or upload</h2>
        <label htmlFor="sheet" className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Paste here</label>
        <textarea id="sheet" rows={8} value={text} onChange={(e) => load(e.target.value)} placeholder={'State\tSpecies\tPoints\tUnit\tYear\tType\nWY\tElk\t5\t\t\t\nCO\tDeer\t3\t61\t2028\ttarget\nAK\tDall Sheep\t\t\t\tbucket list'}
          className="w-full bg-black border border-zinc-800 p-3 rounded-xl text-zinc-200 text-sm font-mono outline-none focus:border-amber-500" />
        <label className="inline-block border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-600 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest cursor-pointer">
          Upload a CSV
          <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); e.target.value = ''; }} />
        </label>
      </section>

      {rows.length > 0 && (
        <section className="space-y-3" aria-labelledby="map-h">
          <h2 id="map-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">Which column is which?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f} className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                <span className="text-zinc-300">{FIELD_LABEL[f]}{f === 'state' || f === 'species' ? ' *' : ''}</span>
                <select className={inputCls} value={map[f] ?? ''} onChange={(e) => setField(f, e.target.value)}>
                  <option value="">— not in my sheet —</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section className="space-y-4" aria-labelledby="preview-h">
          <h2 id="preview-h" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest">What will be added</h2>
          {result.points.length > 0 && (
            <div>
              <p className="text-zinc-300 text-sm font-bold mb-1">{result.points.length} point balance{result.points.length === 1 ? '' : 's'}</p>
              <p className="text-zinc-400 text-sm">{result.points.map((p) => `${p.state} ${p.species}: ${p.points}`).join(' · ')}</p>
              <p className="text-zinc-600 text-xs mt-1">These replace any balance you already have for the same state and species.</p>
            </div>
          )}
          {result.items.length > 0 && (
            <div>
              <p className="text-zinc-300 text-sm font-bold mb-1">{result.items.length} hunt{result.items.length === 1 ? '' : 's'} for the calendar</p>
              <ul className="text-sm text-zinc-400 space-y-1">
                {result.items.map((i, n) => (
                  <li key={n}>
                    <span className="text-zinc-200">{KIND_LABEL[i.kind]}</span> · {i.state} {i.species}{i.unit ? ` · ${i.unit}` : ''}{i.hunt_code ? ` · hunt ${i.hunt_code}` : ''} · {i.target_year ?? 'no year'}{i.notes ? ` — ${i.notes}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.issues.length > 0 && (
            <div className="border border-amber-900 bg-amber-950/30 rounded-xl p-4">
              <p className="text-amber-200 text-sm font-bold mb-1">{result.issues.length} {result.issues.length === 1 ? 'row needs' : 'rows need'} a look (not imported)</p>
              <ul className="text-amber-100/80 text-sm space-y-1">{result.issues.map((x, n) => <li key={n}>Row {x.row}: {x.text}</li>)}</ul>
              <p className="text-zinc-500 text-xs mt-2">Fix them in your sheet and paste again, or add them by hand on the calendar.</p>
            </div>
          )}
          {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
          <button type="button" disabled={busy || (!result.points.length && !result.items.length)} onClick={save}
            className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 disabled:opacity-50">
            {busy ? 'Saving…' : 'Add to my calendar'}
          </button>
        </section>
      )}
    </main>
  );
}
