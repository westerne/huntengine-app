'use client';

// One hunt, led by the question a hunter actually asks of it: if I keep
// applying, how does my chance grow? The chart redraws for any starting
// balance, so "what if I had 10 points" is a tap, not a guess.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Scale } from 'lucide-react';
import { BigNumber, ButtonLink, Card, Caveat, Eyebrow, StatRow } from '../../ui';
import { huntTitle, labelText } from '@/lib/huntName';
import { chanceShort, chanceText, ladderRows, MAX_LADDER_POINTS, type Ladder, type LadderRow } from '@/lib/huntdata/ladder';
import AddToPlan from '../../find/AddToPlan';
import { AskButton } from '../../components/Advisor';

type HuntInfo = {
  key: string; state: string; stateName: string; species: string; unit: string; huntCode: string;
  label: string | null; weapon: string | null; season: { open: string; close: string } | null;
  tags: number | null; applicants: number | null; hunterSuccess: string | null;
  drawYear: number | null; openToYou: boolean;
  drawRules: string; howItDraws: string | null;
  herd: { k: string; v: number; n: string; caveat: string } | null;
  agencyUrl: string | null; agencyName: string | null;
};

const YEARS = 12;
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Chart({ rows }: { rows: LadderRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.chance), 0.0001);
  const H = 140;
  const h = (n: number) => (n <= 0 ? 0 : Math.max(3, Math.round((n / max) * H)));
  const shown = hover ?? null;
  return (
    <figure className="hq-ladder" aria-label={`Yearly chance: ${rows.map((r) => `${r.year}, ${r.points} points, ${chanceText(r.chance)}`).join('; ')}`}>
      <div className="hq-ladder__plot" style={{ height: H + 28 }} onMouseLeave={() => setHover(null)}>
        <div className="hq-ladder__grid" style={{ bottom: H }} aria-hidden="true" />
        <div className="hq-ladder__cols" style={{ '--n': rows.length } as React.CSSProperties}>
          {rows.map((r, i) => (
            <button
              key={r.year} type="button" className="hq-ladder__col"
              aria-label={`${r.year}: ${r.points} points, ${chanceText(r.chance)} that year, ${chanceText(r.cumulative)} drawn by then`}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              onClick={() => setHover(i)}
            >
              {(i === 0 || i === rows.length - 1) && shown !== i && (
                <span className="hq-ladder__val hq-data" style={{ bottom: h(r.chance) + 6 }}>{chanceShort(r.chance)}</span>
              )}
              <span className="hq-ladder__bar" style={{ height: h(r.chance) }} data-on={shown === i} data-now={i === 0} />
            </button>
          ))}
        </div>
        {shown != null && (
          <div className="hq-ladder__tip" role="status" style={{ left: `calc(${((shown + 0.5) / rows.length) * 100}% )` }} data-edge={shown < 2 ? 'start' : shown > rows.length - 3 ? 'end' : undefined}>
            <b>{rows[shown].year}</b> · {rows[shown].points} {rows[shown].points === 1 ? 'point' : 'points'}{rows[shown].chances != null ? ` (${rows[shown].chances} chances)` : ''}
            <br /><span className="hq-data">{chanceText(rows[shown].chance)}</span> that year · <span className="hq-data">{chanceText(rows[shown].cumulative)}</span> drawn by then
          </div>
        )}
      </div>
      <div className="hq-ladder__cols hq-ladder__axis" style={{ '--n': rows.length } as React.CSSProperties} aria-hidden="true">
        {rows.map((r) => <span key={r.year}>{String(r.year).slice(2).padStart(3, '’')}<br /><b>{r.points}</b></span>)}
      </div>
      <figcaption className="hq-small" style={{ marginTop: 4 }}>Year, and the points you&apos;d hold that year</figcaption>
    </figure>
  );
}

export default function HuntView({ hunt, residency, ladder, usesPoints, startPoints, seasonYear }: {
  hunt: HuntInfo; residency: 'resident' | 'nonresident'; ladder: Ladder; usesPoints: boolean;
  startPoints: number | null; seasonYear: number;
}) {
  const [pts, setPts] = useState(startPoints ?? 0);
  const rows = useMemo(() => ladderRows(ladder, usesPoints ? pts : 0, seasonYear, YEARS), [ladder, pts, usesPoints, seasonYear]);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const half = rows.find((r) => r.cumulative >= 50);
  // In a preference draw the answer is a year: the point level that always drew.
  const sureAt = ladder.byPoints.findIndex((c) => c >= 100);
  const sureYear = usesPoints && sureAt > pts ? seasonYear + (sureAt - pts) : null;
  const sp = hunt.species.toLowerCase();
  const res = residency === 'resident' ? 'Resident' : 'Non-resident';
  const flat = ladder.basis === 'overall' || !usesPoints;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Eyebrow>{hunt.stateName} {sp} · {res}</Eyebrow>
        <h1 className="hq-h1" style={{ marginTop: 4 }}>{huntTitle(hunt.unit, hunt.huntCode)}</h1>
        {hunt.label && <p className="hq-body" style={{ marginTop: 6 }}>{labelText(hunt.label)}</p>}
        {(hunt.season || hunt.weapon) && (
          <p className="hq-small" style={{ marginTop: 4 }}>
            {[hunt.weapon && hunt.weapon[0].toUpperCase() + hunt.weapon.slice(1), hunt.season && `${fmtDate(hunt.season.open)} – ${fmtDate(hunt.season.close)} (${hunt.drawYear ?? ''} season)`].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {!hunt.openToYou ? (
        <Caveat tone="stop">This hunt isn&apos;t open to {residency === 'resident' ? 'residents' : 'non-residents'}.</Caveat>
      ) : ladder.basis === 'none' ? (
        <Caveat tone="info">{hunt.stateName} doesn&apos;t publish draw odds for this hunt.</Caveat>
      ) : (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <h2 className="hq-h2">{flat ? 'How it drew last year' : 'Your chance as points build'}</h2>
              <p className="hq-body" style={{ marginTop: 6 }}>
                {flat
                  ? `${hunt.stateName} publishes how this hunt drew overall, not by point level, so this is the hunt's rate, not your own chance${usesPoints ? ' at your points' : ''}.`
                  : half
                    ? `If you apply every year, you're more likely than not to have drawn by ${half.year}.`
                    : sureYear
                      ? `If you apply every year, you'd hold ${sureAt} points in ${sureYear}: enough to draw it if the draw looks like ${hunt.drawYear ?? 'last year'}'s.${last.cumulative > 0 ? ` Before then, about ${chanceText(last.cumulative)} by ${last.year}.` : ''}`
                      : `If you apply every year, there's about a ${chanceText(last.cumulative)} chance you've drawn it by ${last.year}.`}
              </p>
            </div>
            <BigNumber value={chanceShort(first.chance)} sub={flat ? `drew overall (${hunt.drawYear ?? 'last'} draw)` : `in ${first.year} at ${first.points} pts`} />
          </div>

          {usesPoints && !flat && (
            <div className="hq-ladder__step" role="group" aria-label="Starting points">
              <span className="hq-label">{startPoints == null ? `Your ${hunt.state} ${sp} points` : pts === startPoints ? 'Your points now' : 'What if you had'}</span>
              <button type="button" className="hq-btn hq-btn--secondary hq-btn--sm" aria-label="One less point" disabled={pts <= 0} onClick={() => setPts((p) => Math.max(0, p - 1))}><Minus size={14} aria-hidden="true" /></button>
              <span className="hq-data" style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: 18 }} aria-live="polite">{pts}</span>
              <button type="button" className="hq-btn hq-btn--secondary hq-btn--sm" aria-label="One more point" disabled={pts >= MAX_LADDER_POINTS - YEARS} onClick={() => setPts((p) => p + 1)}><Plus size={14} aria-hidden="true" /></button>
              {startPoints != null && pts !== startPoints && <button type="button" className="hq-btn hq-btn--ghost hq-btn--sm" onClick={() => setPts(startPoints)}>Back to {startPoints}</button>}
            </div>
          )}
          {startPoints == null && usesPoints && !flat && (
            <p className="hq-small" style={{ marginTop: 6 }}>We don&apos;t have your {hunt.state} {sp} points yet. <Link href="/plan#points" className="hq-link">Add them</Link> to start from your real number.</p>
          )}

          {/* One overall rate makes every bar the same, which says nothing. */}
          {!flat && <div style={{ marginTop: 16 }}><Chart rows={rows} /></div>}

          <div className="hq-stack" style={{ gap: 6, marginTop: 14 }}>
            <p className="hq-small">If the draw looks like {hunt.drawYear ?? 'last year'}&apos;s: the same tags and the same field of applicants.{!flat ? ' Everyone else builds points too, so real odds likely climb a little slower than this.' : ''}</p>
            {ladder.basis === 'modeled' && <p className="hq-small">Worked out from {hunt.stateName}&apos;s point table: {hunt.howItDraws ?? 'more points, more chances'}.</p>}
            {ladder.basis === 'by-points' && <p className="hq-small">From the agency&apos;s results at each point level. Levels with few applicants jump around.</p>}
          </div>

          {!flat && <details className="hq-ladder__more">
            <summary>See the numbers</summary>
            <table className="hq-table">
              <thead><tr><th scope="col">Year</th><th scope="col">Points</th>{ladder.chances && <th scope="col">Chances</th>}<th scope="col">That year</th><th scope="col">Drawn by then</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year}><td>{r.year}</td><td className="hq-data">{r.points}</td>{ladder.chances && <td className="hq-data">{r.chances}</td>}<td className="hq-data">{chanceText(r.chance)}</td><td className="hq-data">{chanceText(r.cumulative)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>}
        </Card>
      )}

      <StatRow items={[
        { k: 'Tags', v: hunt.tags ?? '—', n: res.toLowerCase() },
        { k: 'Applicants', v: hunt.applicants ?? '—', n: `${hunt.drawYear ?? 'last'} draw` },
        { k: 'Hunter success', v: hunt.hunterSuccess?.match(/^[\d.]+%/)?.[0] ?? '—', n: hunt.hunterSuccess?.replace(/^[\d.]+%\s*/, '') || 'not published' },
        ...(hunt.herd ? [{ k: hunt.herd.k, v: hunt.herd.v, n: hunt.herd.n }] : []),
      ]} />
      {hunt.herd && <p className="hq-small" style={{ marginTop: -6 }}>That ratio is CPW&apos;s estimate for the whole herd this unit belongs to. {hunt.herd.caveat}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {hunt.openToYou && <AddToPlan target={{ state: hunt.state, species: hunt.species, unit: hunt.unit, huntCode: hunt.huntCode, label: hunt.label, year: half?.year ?? seasonYear }} />}
        <ButtonLink href={`/compare?h=${encodeURIComponent(hunt.key)}`} variant="secondary"><Scale size={16} aria-hidden="true" /> Compare</ButtonLink>
        <AskButton size="md" question={`Should I apply for ${hunt.state} ${sp} hunt ${hunt.huntCode} this year or keep building points?`}>Ask about this hunt</AskButton>
      </div>

      {ladder.pointTable.length > 0 && (
        <Card variant="flat">
          <details className="hq-ladder__more" style={{ marginTop: 0 }}>
            <summary>Last draw at each point level ({hunt.drawYear ?? 'latest'})</summary>
            <table className="hq-table">
              <thead><tr><th scope="col">Points</th><th scope="col">Applied</th><th scope="col">Drew</th></tr></thead>
              <tbody>
                {ladder.pointTable.map((l) => <tr key={l.points}><td className="hq-data">{l.points}</td><td className="hq-data">{l.applicants}</td><td className="hq-data">{l.drawn}</td></tr>)}
              </tbody>
            </table>
            {ladder.chances && <p className="hq-small" style={{ marginTop: 8 }}>A level where nobody drew still had a chance; it&apos;s a lottery, and the chart above shows what those points were worth.</p>}
          </details>
        </Card>
      )}

      <Card variant="flat">
        <h2 className="hq-h3">How {hunt.stateName}&apos;s draw works</h2>
        <p className="hq-body" style={{ marginTop: 6 }}>{hunt.drawRules}</p>
        {hunt.agencyUrl && <p className="hq-small" style={{ marginTop: 8 }}>Confirm with <a href={hunt.agencyUrl} target="_blank" rel="noopener noreferrer" className="hq-link">{hunt.agencyName ?? 'the agency'}</a> before you apply.</p>}
      </Card>
    </main>
  );
}
