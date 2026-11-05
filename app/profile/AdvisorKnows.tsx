'use client';

// Me → What the advisor knows (docs/SPEC_ADVISOR.md §7): the facts the hunter
// said Yes to saving, which every conversation starts from. Edit, delete, or
// add one directly; delete every saved conversation in one go.

import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Card } from '../ui';
import { askAdvisor } from '../components/Advisor';
import type { Fact } from '@/lib/advisor/facts';

async function call(method: string, body?: unknown, url = '/api/advisor/facts') {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong — try again.');
  return j;
}

export default function AdvisorKnows() {
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { call('GET').then((j) => setFacts(j.facts)).catch(() => setFacts([])); }, []);

  const run = async (fn: () => Promise<{ facts?: Fact[] }>, done?: string) => {
    setMsg(null);
    try { const j = await fn(); if (j.facts) setFacts(j.facts); if (done) setMsg({ ok: true, text: done }); return true; }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save that.' }); return false; }
  };

  return (
    <Card aria-labelledby="advisor-h" id="advisor">
      <h2 id="advisor-h" className="hq-h2">What the advisor knows</h2>
      <p className="hq-small" style={{ marginTop: 4 }}>Things you told the advisor to remember. Every conversation starts from these. Only you can see them.</p>

      {facts === null ? <p className="hq-small" style={{ marginTop: 12 }}>Loading…</p>
        : !facts.length ? <p className="hq-body" style={{ marginTop: 12 }}>Nothing yet. When you mention something lasting, like your time off or budget, the advisor offers to remember it.</p>
        : (
          <ul className="hq-list" style={{ marginTop: 8 }}>
            {facts.map((f) => (
              <li key={f.id} style={{ padding: '10px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {editing === f.id ? (
                  <form style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}
                    onSubmit={async (e) => { e.preventDefault(); if (await run(() => call('PATCH', { id: f.id, text }))) setEditing(null); }}>
                    <label htmlFor={`fact-${f.id}`} className="hq-sr">Edit fact</label>
                    <input id={`fact-${f.id}`} className="hq-input" style={{ flex: '1 1 200px' }} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} autoFocus />
                    <Button size="sm" type="submit">Save</Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button>
                  </form>
                ) : (
                  <>
                    <span className="hq-body" style={{ flex: 1, minWidth: 0, color: 'var(--ink)' }}>{f.text}</span>
                    <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" aria-label={`Edit ${f.text}`} onClick={() => { setEditing(f.id); setText(f.text); }}><Pencil size={14} aria-hidden="true" /></button>
                    <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" aria-label={`Delete ${f.text}`} onClick={() => run(() => call('DELETE', { id: f.id }))}><Trash2 size={14} aria-hidden="true" /></button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

      <form style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
        onSubmit={async (e) => { e.preventDefault(); if (draft.trim() && await run(() => call('POST', { text: draft }))) setDraft(''); }}>
        <label htmlFor="fact-new" className="hq-sr">Add something for the advisor to know</label>
        <input id="fact-new" className="hq-input" style={{ flex: '1 1 220px' }} placeholder="e.g. One week off, in October" value={draft} maxLength={200} onChange={(e) => setDraft(e.target.value)} />
        <Button size="sm" variant="secondary" type="submit" disabled={!draft.trim()}>Add</Button>
      </form>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 16, borderTop: '1px solid var(--divider)', paddingTop: 14 }}>
        <button type="button" className="hq-link hq-small" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => askAdvisor()}>Open the advisor</button>
        <button type="button" className="hq-small" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--stop)', fontWeight: 600 }}
          onClick={() => window.confirm('Delete every saved conversation? This can’t be undone.') && run(() => call('DELETE', undefined, '/api/advisor/threads'), 'All conversations deleted.')}>
          Delete all conversations
        </button>
      </div>
      {msg && <p className={msg.ok ? 'hq-ok' : 'hq-err'} role={msg.ok ? 'status' : 'alert'} style={{ marginTop: 8 }}>{msg.text}</p>}
    </Card>
  );
}
