'use client';

// The result of step 3: the reachable hunts re-ordered against what the hunter
// said he wants, each one carrying which of his conditions it meets, which it
// breaks, and which the data can't speak to.
//
// Nothing on these cards is written by a model. The chips are computed matches
// and the figures are the agency's, so a card can be wrong about a hunt only if
// the state's own published draw is.

import { useState } from 'react';
import Link from 'next/link';
import { compareKey, MAX_COMPARE } from '@/lib/compare';
import AddToPlan from './AddToPlan';

export type Match = {
  unit: string;
  huntCode: string | null;
  label: string | null;
  season: string | null;
  tags: number | null;
  odds: number | null;
  publishedRate: number | null;
  hunterSuccess: string | null;
  pointsNeeded: number | null;
  antlerless: boolean;
  otc: boolean;
  matched: string[];
  missed: string[];
  unknown: string[];
};

export type Narrowed = {
  state: string;
  species: string;
  speciesKey: string;
  seasonYear: number;
  wants: string[];
  cannot: Array<{ key: string; text: string }>;
  readback: string;
  relaxed: string[];
  excluded: number;
  considered: number;
  pool: { antlered: number; antlerless: number };
  picks: Match[];
  wantLabels: Record<string, string>;
};

const pctText = (n: number) => (n >= 10 ? `${Math.round(n)}%` : `${n.toFixed(1)}%`);

function Chip({ kind, children }: { kind: 'yes' | 'no' | 'maybe'; children: React.ReactNode }) {
  const cls = kind === 'yes'
    ? 'border-amber-700/60 text-amber-500'
    : kind === 'no'
    ? 'border-zinc-800 text-zinc-600 line-through'
    : 'border-zinc-800 text-zinc-600';
  return (
    <span className={`inline-flex items-center gap-1 border ${cls} rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider`}>
      {kind === 'yes' ? '✓' : kind === 'no' ? '✕' : '?'} {children}
    </span>
  );
}

function MatchCard({
  m, labels, lead, n, picked, onPick, full,
}: {
  m: Match;
  labels: Record<string, string>;
  lead: boolean;
  n: Narrowed;
  picked: boolean;
  onPick: () => void;
  full: boolean;
}) {
  const facts = [
    m.season,
    m.tags != null ? `${m.tags} tag${m.tags === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  // The agency's label says "Antlerless elk" somewhere in a long string of hunt
  // numbers. A cow tag is a different hunt, so it gets said in the heading.
  const kind = m.antlerless ? 'Cow or doe tag' : null;

  return (
    <li className={`bg-zinc-900 border rounded-xl px-4 py-4 space-y-2 ${picked ? 'border-amber-700' : 'border-zinc-800'}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0 flex items-start gap-3">
          <input
            type="checkbox"
            checked={picked}
            onChange={onPick}
            // Ticking a fifth would silently drop one on the compare screen.
            disabled={!picked && full}
            aria-label={`Compare ${m.unit}${m.huntCode ? ` ${m.huntCode}` : ''}`}
            className="mt-1 accent-amber-600 shrink-0 disabled:opacity-30"
          />
          <span className="min-w-0">
          <span className="block text-white font-black uppercase italic text-sm">
            {lead && <span className="text-amber-600 not-italic">Best fit · </span>}
            {m.unit}{m.huntCode && m.huntCode !== m.unit ? ` · ${m.huntCode}` : ''}
            {kind && <span className="text-zinc-500 not-italic font-bold"> — {kind}</span>}
          </span>
          {m.label && <span className="block text-zinc-500 text-xs mt-0.5">{m.label}</span>}
            {facts && <span className="block text-zinc-400 text-xs mt-1">{facts}</span>}
          </span>
        </span>
        <span className="text-right shrink-0">
          {m.odds != null && <span className="block text-amber-500 font-black text-sm">{pctText(m.odds)}</span>}
          {m.pointsNeeded != null && (
            <span className="block text-zinc-500 text-[10px] uppercase tracking-widest">
              {m.pointsNeeded} pt{m.pointsNeeded === 1 ? '' : 's'} drew
            </span>
          )}
          {m.hunterSuccess && (
            <span className="block text-zinc-400 text-[10px] uppercase tracking-widest">{m.hunterSuccess} filled</span>
          )}
        </span>
      </div>
      {(m.matched.length > 0 || m.missed.length > 0 || m.unknown.length > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {m.matched.map((k) => <Chip key={k} kind="yes">{labels[k] ?? k}</Chip>)}
          {m.missed.map((k) => <Chip key={k} kind="no">{labels[k] ?? k}</Chip>)}
          {m.unknown.map((k) => <Chip key={k} kind="maybe">{labels[k] ?? k} unknown</Chip>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <Link
          href={`/compare?h=${encodeURIComponent(compareKey(n.state, n.speciesKey, m.huntCode ?? m.unit))}`}
          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white"
        >
          All the data →
        </Link>
        <AddToPlan
          target={{
            state: n.state,
            species: n.species,
            unit: m.unit,
            huntCode: m.huntCode,
            label: m.label,
            year: n.seasonYear,
            otc: m.otc,
          }}
          note={m.matched.length ? `Matched: ${m.matched.map((k) => labels[k] ?? k).join(', ')}.` : undefined}
        />
      </div>
    </li>
  );
}

export default function Matches({ n, onChange }: { n: Narrowed; onChange: () => void }) {
  const relaxedText = n.relaxed.map((k) => n.wantLabels[k] ?? k).join(' or ');
  const [picked, setPicked] = useState<string[]>([]);

  const idOf = (m: Match) => m.huntCode ?? m.unit;
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_COMPARE ? [...p, id] : p));

  // Comparing one hunt against nothing isn't a comparison, so below two we
  // offer the top few instead of disabling the button and explaining why.
  const topFew = n.picks.slice(0, Math.min(3, n.picks.length)).map(idOf);
  const toCompare = picked.length >= 2 ? picked : topFew;
  const compareHref = `/compare?h=${toCompare.map((c) => encodeURIComponent(compareKey(n.state, n.speciesKey, c))).join(',')}`;

  return (
    <section aria-labelledby="matches-h" className="space-y-5">
      <div className="border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h2 id="matches-h" className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          What we took from that
        </h2>
        {n.readback && <p className="text-zinc-100 leading-relaxed">{n.readback}</p>}
        {n.wants.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {n.wants.map((k) => <Chip key={k} kind="yes">{n.wantLabels[k] ?? k}</Chip>)}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            Nothing in that mapped onto something the draw data can sort on, so these are still ranked on
            your odds. Try naming a weapon, a month, antlers or meat, or how many other hunters you can stand.
          </p>
        )}
        <button
          type="button"
          onClick={onChange}
          className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500"
        >
          Say it differently
        </button>
      </div>

      {n.relaxed.length > 0 && (
        <p role="status" className="text-amber-500/90 text-sm border border-amber-900/50 rounded-xl px-4 py-3">
          Nothing with {relaxedText} is within reach in {n.state} at your points. These are the closest hunts —
          each one breaks that condition, and the chip says so.
        </p>
      )}

      {n.picks.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Best fits ({n.picks.length} of {n.considered} you could draw)
          </h3>
          {/* The headline above counts bull and buck tags. If "meat matters"
              widened the pool, the two numbers differ and we say why. */}
          {n.pool.antlerless > 0 && (
            <p className="text-zinc-500 text-xs">
              {n.pool.antlered} antlered and {n.pool.antlerless} antlerless, since you said meat matters.
            </p>
          )}
          {/* A list of one looks like missing data unless we say why it's one. */}
          {n.excluded > 0 && (
            <p className="text-zinc-500 text-xs">
              {n.excluded} of them {n.excluded === 1 ? "doesn't" : "don't"} fit{' '}
              {n.wants.filter((k) => ['archery', 'rifle', 'muzzleloader', 'antleredOnly'].includes(k))
                .map((k) => n.wantLabels[k] ?? k).join(' and ') || 'what you asked for'}, so they&apos;re set aside.
            </p>
          )}
          <ul className="space-y-2">
            {n.picks.map((m, i) => (
              <MatchCard
                key={`${m.unit}|${m.huntCode}`}
                m={m}
                labels={n.wantLabels}
                lead={i === 0 && n.picks.length > 1}
                n={n}
                picked={picked.includes(idOf(m))}
                onPick={() => toggle(idOf(m))}
                full={picked.length >= MAX_COMPARE}
              />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">
          Nothing is within reach in {n.state} for {n.species.toLowerCase()} at your points, so there is nothing
          to narrow. The timeline above is the honest answer.
        </p>
      )}

      {n.cannot.length > 0 && (
        <div className="border border-zinc-800 rounded-2xl p-5 space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            You asked about things the draw data can&apos;t answer
          </h3>
          <ul className="text-zinc-400 text-sm space-y-1">
            {n.cannot.map((c) => <li key={c.key}>— {c.text}</li>)}
          </ul>
          <p className="text-zinc-600 text-xs">
            Draw results are tags, applicants and success rates. Ground like that comes once you&apos;ve picked a
            unit: open one below and the hunt plan covers access, terrain and where to start.
          </p>
        </div>
      )}

      {n.picks.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={compareHref}
            className="bg-amber-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500"
          >
            {picked.length >= 2
              ? `Compare these ${picked.length}`
              : `Compare the top ${toCompare.length}`}
          </Link>
          <span className="text-zinc-600 text-xs">
            {picked.length >= 2
              ? `Side by side: odds, how reliable they are, when you'd likely draw, and what hunters filled.`
              : picked.length === 1
              ? 'Tick one more to compare exactly what you want.'
              : 'Or tick the ones you want to compare.'}
            {picked.length >= MAX_COMPARE && ` ${MAX_COMPARE} is the most we can line up.`}
          </span>
        </div>
      )}
    </section>
  );
}
