'use client';

// SCOUT results, built around decision support: lead with one recommendation
// and the next step, show a few alternatives, and keep every option and the
// search details one click away. Labels are plain words, never color alone.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Plus } from 'lucide-react';
import { huntTitle } from '@/lib/huntName';
import { speciesKeyOf } from '@/lib/species';
import { trophyRange } from '@/lib/trophy';
import { Button, Card, Eyebrow, Tier, type TierKind } from '../ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = any;

export const TIER_LABELS: Record<string, { label: string; tier: TierKind; meaning: string }> = {
  DRAW_NOW: { label: 'Likely draw', tier: 'good', meaning: 'Good odds of drawing this year.' },
  RANDOM_PLAY: { label: 'Fair chance', tier: 'fair', meaning: 'A real chance this year, but not likely.' },
  BUILD_AND_WAIT: { label: 'Build points', tier: 'long', meaning: 'Unlikely this year; worth applying to build toward it.' },
  LONG_GAME: { label: 'Long shot', tier: 'long', meaning: 'A serious multi-year points commitment.' },
};

function seasonText(rec: Rec): string {
  if (typeof rec.season === 'string' && rec.season.trim()) return rec.season;
  const parts: string[] = [];
  if (rec.season?.archery) parts.push(`Archery: ${rec.season.archery.open} – ${rec.season.archery.close}`);
  if (rec.season?.rifle) parts.push(`Rifle: ${rec.season.rifle.open} – ${rec.season.rifle.close}`);
  // Never fill in dates we don't have.
  return parts.length ? parts.join(' | ') : rec.seasonName || 'See state regulations';
}

// Short codes ("27", "5B") read as "Unit 27"; names ("Loup West", "GMU 127") stand alone.
const huntName = (rec: Rec) => huntTitle(rec.unit, rec.huntCode);

function TierTag({ tier }: { tier: string }) {
  const t = TIER_LABELS[tier];
  if (!t) return null;
  return <span title={t.meaning}><Tier tier={t.tier}>{t.label}</Tier></span>;
}

type SaveProps = {
  state: Record<string, { id?: string; busy?: boolean; error?: string }>;
  keyOf: (rec: Rec) => string;
  onSave: (rec: Rec) => void;
};

// "Save to My Season" — becomes a link to the saved record once saved.
function SaveButton({ rec, save }: { rec: Rec; save?: SaveProps }) {
  if (!save) return null;
  const s = save.state[save.keyOf(rec)];
  if (s?.id) {
    return (
      <span className="hq-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Check size={16} aria-hidden="true" />
        <Link href={`/season/${s.id}`} className="hq-link">Saved. Open in My Season</Link>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <Button type="button" variant="secondary" size="sm" disabled={s?.busy} onClick={() => save.onSave(rec)}>
        {s?.busy ? 'Saving…' : <><Plus size={14} aria-hidden="true" /> Save to My Season</>}
      </Button>
      {s?.error && <span role="alert" className="hq-err">{s.error}</span>}
    </span>
  );
}

function Fact({ label, value, data }: { label: string; value: ReactNode; data?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="hq-label">{label}</p>
      <div style={{ marginTop: 2, fontWeight: 700, fontSize: 15, color: data ? 'var(--data)' : 'var(--ink)', overflowWrap: 'anywhere' }}>{value || '—'}</div>
    </div>
  );
}

const factGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 } as const;
const actions = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 } as const;

function Details({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="hq-card hq-card--flat" style={{ padding: 0 }}>
      <summary className="hq-h3" style={{ cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, listStyle: 'none' }}>
        <span>{summary}</span>
        <ChevronDown size={18} className="hq-row__chev" aria-hidden="true" />
      </summary>
      <div style={{ padding: '0 18px 18px' }}>{children}</div>
    </details>
  );
}

export default function ScoutResults({
  recommendations,
  drawReality,
  actionPlan,
  stateCode,
  drawableCount,
  onLearnMore,
  onShowDrawable,
  searchSummary,
  save,
  species,
}: {
  recommendations: Rec[];
  drawReality: any | null;
  actionPlan: any | null;
  stateCode: string;
  drawableCount: number;
  onLearnMore: (rec: Rec) => void;
  onShowDrawable: () => void;
  searchSummary: ReactNode;
  save?: SaveProps;
  species?: string;
}) {
  const [lead, ...rest] = recommendations;
  const alternatives = rest.slice(0, 3);

  if (!lead) {
    return (
      <div className="hq-stack">
        <Card>
          <p className="hq-h3">No hunts matched this search.</p>
          <p className="hq-body" style={{ marginTop: 4 }}>Try a different weapon or species, or loosen the trophy and timeline settings.</p>
        </Card>
        <Details summary="Your search">{searchSummary}</Details>
      </div>
    );
  }

  return (
    <div className="hq-stack hq-stack--lg">
      {/* ── 1. THE RECOMMENDATION ─────────────────────────────────────────── */}
      <Card aria-labelledby="rec-heading" className="hq-fade-up">
        <div className="hq-stack">
          <div>
            <Eyebrow>Our recommendation</Eyebrow>
            <h2 id="rec-heading" className="hq-h2" style={{ marginTop: 4 }}>
              {actionPlan?.headline || `Apply for ${huntName(lead)}`}
            </h2>
            {drawReality?.summary && <p className="hq-body" style={{ marginTop: 6 }}>{drawReality.summary}</p>}
            {save && species && speciesKeyOf(species, stateCode) && (
              <p style={{ marginTop: 8 }}>
                <Link
                  href={`/compare?h=${[lead, ...alternatives].filter((r) => r.huntCode).slice(0, 4).map((r) => encodeURIComponent(`${stateCode}~${speciesKeyOf(species, stateCode)}~${r.huntCode}`)).join(',')}`}
                  className="hq-link"
                >
                  Compare these side by side
                </Link>
              </p>
            )}
          </div>

          <div className="hq-inset" style={factGrid}>
            <Fact label="Top pick" value={<>{stateCode} {huntName(lead)}</>} />
            <Fact label="Your odds" value={lead.currentOdds} data />
            <Fact label="Outlook" value={<TierTag tier={lead.tier} />} />
            <Fact label="Season" value={seasonText(lead)} />
          </div>

          {lead.whyItFits && <p className="hq-body">{lead.whyItFits}</p>}
          {lead.tradeoffs && <p className="hq-small hq-quote">Tradeoff: {lead.tradeoffs}</p>}

          {actionPlan?.steps?.length > 0 && (
            <div>
              <h3 className="hq-h3">Next steps</h3>
              <ol className="hq-body" style={{ margin: '6px 0 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {actionPlan.steps.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div style={actions}>
            <Button type="button" onClick={() => onLearnMore(lead)}>Get the unit brief <ArrowRight size={16} aria-hidden="true" /></Button>
            <SaveButton rec={lead} save={save} />
          </div>
        </div>
      </Card>

      {/* ── 2. ALTERNATIVES ───────────────────────────────────────────────── */}
      {alternatives.length > 0 && (
        <section aria-labelledby="alt-heading" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="alt-heading" className="hq-h2">Alternatives</h2>
          <Card variant="flat" style={{ padding: '4px 18px' }}>
            <ul className="hq-list">
              {alternatives.map((rec, i) => (
                <li key={`${rec.unit}-${rec.huntCode ?? i}`} style={{ padding: '14px 0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <p className="hq-h3">{huntName(rec)}</p>
                      <TierTag tier={rec.tier} />
                    </div>
                    {rec.currentOdds && <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--data)' }}>{rec.currentOdds}</p>}
                    {rec.whyItFits && <p className="hq-small" style={{ color: 'var(--ink-soft)' }}>{rec.whyItFits}</p>}
                    <div><SaveButton rec={rec} save={save} /></div>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onLearnMore(rec)}>Unit brief</Button>
                </li>
              ))}
            </ul>
          </Card>
          {actionPlan?.pointBankingAdvice && (
            <p className="hq-small hq-quote">{actionPlan.pointBankingAdvice}</p>
          )}
        </section>
      )}

      {/* ── 3. DETAILS ON DEMAND ──────────────────────────────────────────── */}
      <div className="hq-stack" style={{ gap: 12 }}>
        <Details summary={`All ${recommendations.length} options in detail`}>
          <div className="hq-stack" style={{ gap: 12 }}>
            {drawableCount > 0 && (
              <div>
                <Button type="button" variant="secondary" size="sm" onClick={onShowDrawable}>
                  See every unit you can likely draw ({drawableCount}) <ArrowRight size={14} aria-hidden="true" />
                </Button>
              </div>
            )}
            {recommendations.map((rec, i) => (
              <div key={`${rec.unit}-${rec.huntCode ?? i}`} className="hq-inset hq-stack" style={{ gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h3 className="hq-h3">{rec.state || stateCode} {huntName(rec)}</h3>
                  <TierTag tier={rec.tier} />
                </div>
                <div style={factGrid}>
                  <Fact label="Your odds" value={rec.currentOdds} data />
                  <Fact label="Season" value={seasonText(rec)} />
                  <Fact label="Typical / top end" value={trophyRange(rec.typicalScore, rec.topEndScore || rec.topEnd)} />
                  <Fact label="Terrain" value={rec.terrain || rec.terrainType} />
                </div>
                {rec.whyItFits && <p className="hq-body">{rec.whyItFits}</p>}
                {rec.tradeoffs && <p className="hq-small hq-quote">{rec.tradeoffs}</p>}
                <div style={actions}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onLearnMore(rec)}>Get the unit brief</Button>
                  <SaveButton rec={rec} save={save} />
                </div>
              </div>
            ))}
          </div>
        </Details>

        <Details summary="Your search">{searchSummary}</Details>
      </div>

      <p className="hq-small">Odds come from past published draw results where we have them. They are not a forecast. Confirm seasons, fees and rules with the state agency before you apply.</p>
    </div>
  );
}
