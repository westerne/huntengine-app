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
import { AskButton } from '../components/Advisor';
import AddToPlan from './AddToPlan';
import { Button, ButtonLink, Card, Caveat } from '../ui';

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


// A condition tag, not a toggle: it shows, it isn't tapped, so it carries no
// gold. Green and the tick go together; a miss is struck through and says so.
function Chip({ kind, children }: { kind: 'yes' | 'no' | 'maybe'; children: React.ReactNode }) {
  const color = kind === 'yes' ? 'var(--good)' : kind === 'no' ? 'var(--ink-muted)' : 'var(--ink-soft)';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-pill)',
        border: `1px solid ${kind === 'yes' ? 'var(--good)' : 'var(--divider)'}`,
        background: kind === 'maybe' ? 'var(--surface-sunk)' : 'transparent',
        color, fontSize: 13, fontWeight: 600, lineHeight: 1.4,
        textDecoration: kind === 'no' ? 'line-through' : undefined,
      }}
    >
      <span aria-hidden="true">{kind === 'yes' ? '✓' : kind === 'no' ? '✕' : '?'}</span>
      {kind === 'yes' && <span className="hq-sr">Fits:</span>}
      {kind === 'no' && <span className="hq-sr">Doesn&apos;t fit:</span>}
      {children}
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
    <Card as="li" style={{ padding: 16, borderColor: picked ? 'var(--brand)' : undefined, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <input
            type="checkbox"
            checked={picked}
            onChange={onPick}
            // Ticking a fifth would silently drop one on the compare screen.
            disabled={!picked && full}
            aria-label={`Compare ${m.unit}${m.huntCode ? ` ${m.huntCode}` : ''}`}
            style={{ marginTop: 3, width: 18, height: 18, flex: 'none', accentColor: 'var(--brand)', opacity: !picked && full ? 0.35 : 1 }}
          />
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {lead && <span className="hq-eyebrow" style={{ display: 'block', marginBottom: 2 }}>Best fit</span>}
            <span className="hq-h3" style={{ display: 'block' }}>
              {m.unit}{m.huntCode && m.huntCode !== m.unit ? ` · ${m.huntCode}` : ''}
              {kind && <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}> — {kind}</span>}
            </span>
            {m.label && <span className="hq-small" style={{ display: 'block', marginTop: 2 }}>{m.label}</span>}
            {facts && <span className="hq-small" style={{ display: 'block', marginTop: 4, color: 'var(--ink-soft)' }}>{facts}</span>}
          </span>
        </span>
        <span style={{ textAlign: 'right', flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {m.odds != null
            ? <span className="hq-data" style={{ fontWeight: 700, fontSize: 16 }}>{pctText(m.odds)}</span>
            // Colorado and Utah publish a rate per hunt and nothing by point
            // level. That figure is the hunt's, not his, and says so.
            : m.publishedRate != null && (
              <>
                <span className="hq-data" style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-soft)' }}>{pctText(m.publishedRate)}</span>
                <span className="hq-small">drew overall</span>
              </>
            )}
          {m.pointsNeeded != null && (
            <span className="hq-small">
              {m.pointsNeeded} pt{m.pointsNeeded === 1 ? '' : 's'} drew
            </span>
          )}
          {m.hunterSuccess && (
            <span className="hq-small">{m.hunterSuccess} filled</span>
          )}
        </span>
      </div>
      {(m.matched.length > 0 || m.missed.length > 0 || m.unknown.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {m.matched.map((k) => <Chip key={k} kind="yes">{labels[k] ?? k}</Chip>)}
          {m.missed.map((k) => <Chip key={k} kind="no">{labels[k] ?? k}</Chip>)}
          {m.unknown.map((k) => <Chip key={k} kind="maybe">{labels[k] ?? k} unknown</Chip>)}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <Link
          href={`/hunt/${encodeURIComponent(compareKey(n.state, n.speciesKey, m.huntCode ?? m.unit))}`}
          className="hq-link hq-small"
        >
          Odds as points build
        </Link>
        <AskButton variant="ghost" question={`Should I apply for ${n.state} ${n.species.toLowerCase()} hunt ${m.huntCode ?? m.unit} this year?`}>Ask</AskButton>
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
    </Card>
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
    <section aria-labelledby="matches-h" className="hq-stack hq-stack--lg hq-fade-up">
      <Card>
        <div className="hq-stack" style={{ gap: 12 }}>
          <h2 id="matches-h" className="hq-h3">What we took from that</h2>
          {n.readback && <p className="hq-body" style={{ color: 'var(--ink)' }}>{n.readback}</p>}
          {n.wants.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {n.wants.map((k) => <Chip key={k} kind="yes">{n.wantLabels[k] ?? k}</Chip>)}
            </div>
          ) : (
            <p className="hq-small" style={{ color: 'var(--ink-soft)' }}>
              Nothing in that mapped onto something the draw data can sort on, so these are still ranked on
              your odds. Try naming a weapon, a month, antlers or meat, or how many other hunters you can stand.
            </p>
          )}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={onChange}>Say it differently</Button>
          </div>
        </div>
      </Card>

      {n.relaxed.length > 0 && (
        <div role="status">
          <Caveat tone="warn">
            Nothing with {relaxedText} is within reach in {n.state} at your points. These are the closest hunts —
            each one breaks that condition, and the chip says so.
          </Caveat>
        </div>
      )}

      {n.picks.length > 0 ? (
        <div className="hq-stack" style={{ gap: 10 }}>
          <h3 className="hq-h3">
            Best fits ({n.picks.length} of {n.considered} you could draw)
          </h3>
          {/* The headline above counts bull and buck tags. If "meat matters"
              widened the pool, the two numbers differ and we say why. */}
          {n.pool.antlerless > 0 && (
            <p className="hq-small">
              {n.pool.antlered} antlered and {n.pool.antlerless} antlerless, since you said meat matters.
            </p>
          )}
          {/* A list of one looks like missing data unless we say why it's one. */}
          {n.excluded > 0 && (
            <p className="hq-small">
              {n.excluded} of them {n.excluded === 1 ? "doesn't" : "don't"} fit{' '}
              {n.wants.filter((k) => ['archery', 'rifle', 'muzzleloader', 'antleredOnly'].includes(k))
                .map((k) => n.wantLabels[k] ?? k).join(' and ') || 'what you asked for'}, so they&apos;re set aside.
            </p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        <p className="hq-body">
          Nothing is within reach in {n.state} for {n.species.toLowerCase()} at your points, so there is nothing
          to narrow. The timeline above is the honest answer.
        </p>
      )}

      {n.cannot.length > 0 && (
        <Card variant="flat">
          <div className="hq-stack" style={{ gap: 10 }}>
            <h3 className="hq-h3">You asked about things the draw data can&apos;t answer</h3>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {n.cannot.map((c) => <li key={c.key} className="hq-body" style={{ fontSize: 14 }}>{c.text}</li>)}
            </ul>
            <p className="hq-small">
              Draw results are tags, applicants and success rates. Ground like that comes once you&apos;ve picked a
              unit: open one below and the hunt plan covers access, terrain and where to start.
            </p>
          </div>
        </Card>
      )}

      {n.picks.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <ButtonLink href={compareHref}>
            {picked.length >= 2
              ? `Compare these ${picked.length}`
              : `Compare the top ${toCompare.length}`}
          </ButtonLink>
          <span className="hq-small" style={{ flex: '1 1 220px' }}>
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
