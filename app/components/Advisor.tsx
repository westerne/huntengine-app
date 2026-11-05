'use client';

// The advisor sheet (docs/SPEC_ADVISOR.md §3–4): the "Ask" button in the
// header opens it full-screen on a phone and as a side panel on desktop. Other
// screens open it already pointed at something with askAdvisor("...").
//
// Answers arrive only after the server's answer check, so what's shown here is
// what was checked. The "Based on" line and the buttons come from the server,
// never from the model's text.

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, ChevronDown, ExternalLink, MessageCircle, RotateCcw, X } from 'lucide-react';
import { Button, Mark } from '../ui';

type Source = { label: string; url?: string | null };
type Action =
  | { kind: 'add_to_plan'; label: string; item: Record<string, unknown> }
  | { kind: 'reminder'; label: string; task: Record<string, unknown> };
type Msg =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; sources: Source[]; actions: Action[] }
  | { role: 'error'; text: string };

const EVENT = 'hq-ask';
const STORE = 'hq-advisor';

// Open the sheet from anywhere, optionally asking a question straight away.
export function askAdvisor(question?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { question } }));
}

// A context entry point (§3): opens the sheet already asking about this thing.
export function AskButton({ question, children, variant = 'secondary', size = 'sm' }: {
  question: string; children: ReactNode; variant?: 'secondary' | 'ghost'; size?: 'sm' | 'md';
}) {
  return (
    <button type="button" className={`hq-btn hq-btn--${variant}${size === 'sm' ? ' hq-btn--sm' : ''}`} onClick={() => askAdvisor(question)}>
      <MessageCircle size={size === 'sm' ? 14 : 16} aria-hidden="true" /> {children}
    </button>
  );
}

// Numbers and dates read in the data style, the same as on the screens.
const DATA = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\$?\d+(?:,\d{3})*(?:\.\d+)?%?)/g;
function withData(text: string): ReactNode[] {
  return text.split(DATA).map((part, i) =>
    i % 2 ? <span key={i} className="hq-data">{part}</span> : <Fragment key={i}>{part}</Fragment>);
}

function AnswerText({ text }: { text: string }) {
  // "Tradeoff:" and "Next:" get their own line even when written mid-paragraph.
  const lines = text.replace(/\s+(Tradeoff|Next):\s*/g, '\n$1: ').split('\n').map((l) => l.trim()).filter(Boolean);
  // The recommendation is the first sentence; the rest of its line reads as body.
  const first = lines[0]?.match(/^(.+?[.!?])\s+(.+)$/);
  if (first) lines.splice(0, 1, first[1], first[2]);
  return (
    <div className="hq-ask__answer">
      {lines.map((line, i) => {
        const label = line.match(/^(Tradeoff|Next|Why):\s*/i);
        if (i === 0) return <p key={i} className="hq-ask__lead">{withData(line)}</p>;
        return (
          <p key={i} className="hq-body">
            {label && <b>{label[1]}: </b>}
            {withData(label ? line.slice(label[0].length) : line)}
          </p>
        );
      })}
    </div>
  );
}

function BasedOn({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="hq-ask__based">
      <button type="button" className="hq-ask__basedbtn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Based on {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        <ChevronDown size={14} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <ul className="hq-ask__sources">
          {sources.map((s) => (
            <li key={s.label}>
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="hq-link">{s.label} <ExternalLink size={12} aria-hidden="true" /></a> : s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "Ask first": nothing is saved until the hunter taps.
function ActionButton({ a }: { a: Action }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const run = async () => {
    setState('busy');
    const [url, body] = a.kind === 'add_to_plan' ? ['/api/plan-items', a.item] : ['/api/tasks', { ...a.task, kind: 'custom' }];
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not save that.');
      setState('done');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save that.');
      setState('error');
    }
  };
  if (state === 'done') {
    return (
      <p className="hq-small" role="status">
        {a.kind === 'add_to_plan' ? 'Added to your plan. ' : 'Reminder set. '}
        <Link href={a.kind === 'add_to_plan' ? '/plan' : '/today#todo'} className="hq-link">{a.kind === 'add_to_plan' ? 'Open your plan' : 'See it on Today'}</Link>
      </p>
    );
  }
  return (
    <div>
      <Button size="sm" disabled={state === 'busy'} onClick={run}>{state === 'busy' ? 'Saving…' : a.label}</Button>
      {state === 'error' && <p className="hq-err" role="alert">{err}</p>}
    </div>
  );
}

export default function Advisor() {
  const [open, setOpen] = useState(false);
  // The conversation survives a reload in this tab, nothing more (§7 saves it
  // properly). Safe to read here: the sheet isn't rendered until it's opened.
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const s = typeof window !== 'undefined' ? sessionStorage.getItem(STORE) : null; return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const busy = status !== null;
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<Msg[]>(msgs);

  useEffect(() => {
    msgsRef.current = msgs;
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30))); } catch { /* private mode */ }
  }, [msgs]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, status]);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || abort.current) return;
    const history = msgsRef.current
      .filter((m): m is Exclude<Msg, { role: 'error' }> => m.role !== 'error')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setDraft('');
    setStatus('Thinking');
    const ctl = new AbortController();
    abort.current = ctl;
    const fail = (text: string) => setMsgs((m) => [...m, { role: 'error', text }]);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }), signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        fail(j.error || 'The advisor is unavailable right now.');
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let answered = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === 'status') setStatus(ev.text);
          else if (ev.type === 'answer') { answered = true; setMsgs((m) => [...m, { role: 'assistant', text: ev.text, sources: ev.sources ?? [], actions: ev.actions ?? [] }]); }
          else if (ev.type === 'error') { answered = true; fail(ev.error); }
        }
      }
      if (!answered) fail('The answer was cut off. Try asking again.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') fail('Could not reach the advisor. Check your connection and try again.');
    } finally {
      if (abort.current === ctl) abort.current = null;
      setStatus(null);
    }
  }, []);

  // Opened from the header, or from another screen with a question ready.
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (q) void ask(q);
    };
    window.addEventListener(EVENT, onAsk);
    return () => window.removeEventListener(EVENT, onAsk);
  }, [ask]);

  useEffect(() => {
    if (!open) return;
    if (suggestions === null) {
      fetch('/api/advisor').then((r) => (r.ok ? r.json() : null)).then((j) => setSuggestions(j?.suggestions ?? [])).catch(() => setSuggestions([]));
    }
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    // Full screen on a phone: the page behind shouldn't scroll.
    const phone = window.matchMedia('(max-width: 899px)').matches;
    if (phone) document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, suggestions]);

  const close = () => { setOpen(false); opener.current?.focus(); };
  const startOver = () => { abort.current?.abort(); abort.current = null; setStatus(null); setMsgs([]); input.current?.focus(); };
  const submit = () => { if (!busy) void ask(draft); };

  return (
    <>
      <button ref={opener} type="button" className="hq-btn hq-btn--secondary hq-btn--sm" aria-expanded={open} aria-controls="hq-ask" onClick={() => setOpen((o) => !o)}>
        <MessageCircle size={16} aria-hidden="true" /> Ask
      </button>
      {/* Portaled out of the header: its blur would otherwise pin a fixed sheet inside it. */}
      {open && createPortal(
        <div className="hq"><div id="hq-ask" className="hq-ask" role="dialog" aria-label="Ask the advisor">
          <div className="hq-ask__head">
            <p className="hq-h3">Ask</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {msgs.length > 0 && <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={startOver}><RotateCcw size={14} aria-hidden="true" /> New</button>}
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={close} aria-label="Close"><X size={18} aria-hidden="true" /></button>
            </div>
          </div>

          <div className="hq-ask__body" aria-live="polite">
            {!msgs.length && (
              <div className="hq-ask__empty">
                <Mark size={36} />
                <p className="hq-h3">Ask about draws, points, deadlines and costs.</p>
                <p className="hq-small">Answers come from posted state data and your own plan.</p>
                <div className="hq-ask__suggest">
                  {(suggestions ?? []).map((q) => (
                    <button key={q} type="button" className="hq-ask__chip" onClick={() => ask(q)} disabled={busy}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              m.role === 'user' ? <p key={i} className="hq-ask__q">{m.text}</p>
              : m.role === 'error' ? <p key={i} className="hq-err" role="alert">{m.text}</p>
              : (
                <div key={i} className="hq-ask__a">
                  <AnswerText text={m.text} />
                  {m.actions.length > 0 && <div className="hq-ask__actions">{m.actions.map((a) => <ActionButton key={a.label} a={a} />)}</div>}
                  <BasedOn sources={m.sources} />
                </div>
              )
            ))}
            {busy && <p className="hq-ask__status" role="status"><span className="hq-ask__dots" aria-hidden="true"><i /><i /><i /></span>{status}…</p>}
            <div ref={end} />
          </div>

          <form className="hq-ask__foot" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="hq-ask__inputrow">
              <label htmlFor="hq-ask-input" className="hq-sr">Your question</label>
              <textarea
                id="hq-ask-input" ref={input} className="hq-input hq-ask__input" rows={1} maxLength={800}
                placeholder="Ask a question" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              />
              <button type="submit" className="hq-btn hq-btn--primary hq-ask__send" disabled={busy || !draft.trim()} aria-label="Send">
                <ArrowUp size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="hq-small">Check with the state before you apply or pay.</p>
          </form>
        </div></div>,
        document.body,
      )}
    </>
  );
}
