'use client';

// SCOUT results, built around decision support: lead with one recommendation
// and the next step, show a few alternatives, and keep every option and the
// search details one click away. Labels are plain words, never color alone.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { huntTitle } from '@/lib/huntName';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = any;

export const TIER_LABELS: Record<string, { label: string; color: string; meaning: string }> = {
  DRAW_NOW: { label: 'Likely draw', color: 'text-green-400', meaning: 'Good odds of drawing this year.' },
  RANDOM_PLAY: { label: 'Fair chance', color: 'text-amber-400', meaning: 'A real chance this year, but not likely.' },
  BUILD_AND_WAIT: { label: 'Build points', color: 'text-blue-400', meaning: 'Unlikely this year; worth applying to build toward it.' },
  LONG_GAME: { label: 'Long shot', color: 'text-red-400', meaning: 'A serious multi-year points commitment.' },
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
  return <span className={`text-[10px] font-black uppercase tracking-widest ${t.color}`}>{t.label}</span>;
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
  if (s?.id) return <Link href={`/season/${s.id}`} className="text-green-400 text-[10px] font-black uppercase tracking-widest hover:text-green-300">✓ Saved — open in My Season</Link>;
  return (
    <span className="inline-flex flex-col">
      <button type="button" disabled={s?.busy} onClick={() => save.onSave(rec)}
        className="text-amber-500 text-[10px] font-black uppercase tracking-widest hover:text-amber-400 disabled:opacity-50">
        {s?.busy ? 'Saving…' : '+ Save to My Season'}
      </button>
      {s?.error && <span role="alert" className="text-red-400 text-[10px] mt-1">{s.error}</span>}
    </span>
  );
}

function Fact({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold ${accent ?? 'text-zinc-100'}`}>{value || '—'}</p>
    </div>
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
}) {
  const [lead, ...rest] = recommendations;
  const alternatives = rest.slice(0, 3);

  if (!lead) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-left">
        <p className="text-zinc-200 font-bold mb-2">No hunts matched this search.</p>
        <p className="text-zinc-400 text-sm">Try a different weapon or species, or loosen the trophy and timeline settings.</p>
        <details className="mt-6"><summary className="cursor-pointer text-zinc-500 text-xs font-black uppercase tracking-widest">Your search</summary><div className="mt-4">{searchSummary}</div></details>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* ── 1. THE RECOMMENDATION ─────────────────────────────────────────── */}
      <section aria-labelledby="rec-heading" className="bg-zinc-900 border border-amber-800/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 md:px-8 pt-7 pb-5 border-b border-zinc-800">
          <p className="text-[10px] uppercase text-amber-500 font-black tracking-widest mb-2">Our recommendation</p>
          <h2 id="rec-heading" className="text-2xl md:text-3xl font-black italic uppercase text-white leading-tight">
            {actionPlan?.headline || `Apply for ${huntName(lead)}`}
          </h2>
          {drawReality?.summary && <p className="text-zinc-300 text-sm leading-relaxed mt-3">{drawReality.summary}</p>}
        </div>

        <div className="px-6 md:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-5 border-b border-zinc-800">
          <Fact label="Top pick" value={<>{stateCode} {huntName(lead)}</>} />
          <Fact label="Your odds" value={lead.currentOdds} accent="text-green-400" />
          <Fact label="Outlook" value={<TierTag tier={lead.tier} />} />
          <Fact label="Season" value={seasonText(lead)} />
        </div>

        <div className="px-6 md:px-8 py-6 space-y-5">
          {lead.whyItFits && <p className="text-zinc-300 text-sm leading-relaxed">{lead.whyItFits}</p>}
          {lead.tradeoffs && <p className="text-zinc-500 text-xs italic border-l-2 border-zinc-700 pl-3">Tradeoff: {lead.tradeoffs}</p>}

          {actionPlan?.steps?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-zinc-400 font-black tracking-widest mb-2">Next steps</p>
              <ol className="space-y-2">
                {actionPlan.steps.map((step: string, i: number) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="text-amber-500 font-black text-xs mt-0.5 shrink-0">{i + 1}.</span>
                    <span className="text-zinc-200 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <button
              onClick={() => onLearnMore(lead)}
              className="w-full md:w-auto px-8 bg-amber-600 text-white py-4 font-black rounded-xl hover:bg-amber-500 uppercase tracking-widest text-[11px] shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Get the unit brief
            </button>
            <SaveButton rec={lead} save={save} />
          </div>
        </div>
      </section>

      {/* ── 2. ALTERNATIVES ───────────────────────────────────────────────── */}
      {alternatives.length > 0 && (
        <section aria-labelledby="alt-heading">
          <h3 id="alt-heading" className="text-[11px] uppercase text-zinc-400 font-black tracking-widest mb-3">Alternatives</h3>
          <div className="space-y-3">
            {alternatives.map((rec, i) => (
              <div key={`${rec.unit}-${rec.huntCode ?? i}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="md:w-56 shrink-0">
                  <p className="text-white font-black uppercase italic">{huntName(rec)}</p>
                  <TierTag tier={rec.tier} />
                </div>
                <div className="flex-1">
                  <p className="text-green-400 text-sm font-bold">{rec.currentOdds}</p>
                  {rec.whyItFits && <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{rec.whyItFits}</p>}
                  <div className="mt-2"><SaveButton rec={rec} save={save} /></div>
                </div>
                <button
                  onClick={() => onLearnMore(rec)}
                  className="md:w-40 shrink-0 bg-zinc-100 text-black py-3 font-black rounded-lg hover:bg-amber-500 uppercase tracking-widest text-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  Unit brief
                </button>
              </div>
            ))}
          </div>
          {actionPlan?.pointBankingAdvice && (
            <p className="text-zinc-500 text-xs italic border-l-2 border-zinc-700 pl-3 mt-4">{actionPlan.pointBankingAdvice}</p>
          )}
        </section>
      )}

      {/* ── 3. DETAILS ON DEMAND ──────────────────────────────────────────── */}
      <details className="group bg-zinc-950 border border-zinc-800 rounded-2xl">
        <summary className="cursor-pointer px-6 py-4 text-zinc-300 text-xs font-black uppercase tracking-widest">
          All {recommendations.length} options in detail
        </summary>
        <div className="px-4 md:px-6 pb-6 space-y-4">
          {drawableCount > 0 && (
            <button onClick={onShowDrawable} className="text-green-400 text-xs font-black uppercase tracking-widest hover:text-green-300">
              See every unit you can likely draw ({drawableCount}) →
            </button>
          )}
          {recommendations.map((rec, i) => (
            <div key={`${rec.unit}-${rec.huntCode ?? i}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <p className="text-white font-black uppercase italic">{rec.state || stateCode} {huntName(rec)}</p>
                <TierTag tier={rec.tier} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Fact label="Your odds" value={rec.currentOdds} accent="text-green-400" />
                <Fact label="Season" value={seasonText(rec)} />
                <Fact label="Typical / top end" value={`${rec.typicalScore || '—'} / ${rec.topEndScore || rec.topEnd || '—'}`} />
                <Fact label="Terrain" value={rec.terrain || rec.terrainType} />
              </div>
              {rec.whyItFits && <p className="text-zinc-300 text-sm leading-relaxed">{rec.whyItFits}</p>}
              {rec.tradeoffs && <p className="text-zinc-500 text-xs mt-2 italic border-l-2 border-zinc-700 pl-3">{rec.tradeoffs}</p>}
              <div className="mt-4 flex flex-wrap gap-6">
                <button onClick={() => onLearnMore(rec)} className="text-amber-500 text-[10px] font-black uppercase tracking-widest hover:text-amber-400">
                  Get the unit brief →
                </button>
                <SaveButton rec={rec} save={save} />
              </div>
            </div>
          ))}
        </div>
      </details>

      <details className="bg-zinc-950 border border-zinc-800 rounded-2xl">
        <summary className="cursor-pointer px-6 py-4 text-zinc-500 text-xs font-black uppercase tracking-widest">Your search</summary>
        <div className="px-4 md:px-6 pb-6">{searchSummary}</div>
      </details>
    </div>
  );
}
