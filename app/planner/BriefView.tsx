'use client';

// Unit brief, hunt plan and gear list for one unit (the BRIEF / FULL_SUITE result).

/* eslint-disable @typescript-eslint/no-explicit-any */

import dynamic from 'next/dynamic';
import type { FlowStep } from './types';

// Leaflet touches `window`, so load the map client-side only.
const UnitMap = dynamic(() => import('../UnitMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[440px] w-full flex items-center justify-center bg-zinc-950">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Loading unit boundary…</p>
    </div>
  ),
});

export const BRIEF_TABS = ['unit-brief', 'hunt-plan', 'gear-list'] as const;
type BriefTab = (typeof BRIEF_TABS)[number];

const asList = (v: any): any[] => (Array.isArray(v) ? v : typeof v === 'object' && v !== null ? Object.values(v) : []);

export default function BriefView({
  tab, onTab, unitBrief, huntPlan, gearList, map,
}: {
  tab: BriefTab;
  onTab: (t: FlowStep) => void;
  unitBrief: any;
  huntPlan: any;
  gearList: any;
  map: { unit: string; state: string; species: string };
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 text-left">
      <div className="flex justify-center gap-4 mb-4" role="tablist">
        {BRIEF_TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => onTab(t)} className={`px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest border transition-all ${tab === t ? 'bg-amber-600 border-amber-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>
      <h2 className="text-4xl font-black italic uppercase border-l-8 border-amber-600 pl-8 leading-none">
        {tab === 'unit-brief' ? 'Unit Visualization' : tab.replace('-', ' ')}
      </h2>
      <div className="bg-zinc-900/80 p-6 md:p-12 rounded-3xl border border-zinc-800 shadow-inner">
        {tab === 'unit-brief' && (
          <div className="space-y-8">
            {/* Real unit boundary on satellite imagery. */}
            <div className="rounded-2xl overflow-hidden border border-zinc-800">
              <UnitMap unit={map.unit} state={map.state} species={map.species} />
            </div>
            {typeof unitBrief === 'object' && unitBrief !== null ? (
              Object.entries(unitBrief).map(([key, value]) => (
                <div key={key} className="border-b border-zinc-800 pb-6 last:border-0">
                  <h3 className="font-black uppercase text-amber-500 text-xs tracking-[0.2em] mb-3">{key}</h3>
                  <div className="text-zinc-300 text-sm leading-loose whitespace-pre-wrap font-sans">
                    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  </div>
                </div>
              ))
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{unitBrief || 'No data available.'}</pre>
            )}
          </div>
        )}

        {tab === 'hunt-plan' && (() => {
          const days = asList(huntPlan);
          if (days.length === 0) return <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{String(huntPlan || 'No plan generated.')}</pre>;
          return (
            <div className="space-y-8">
              {days.map((day: any, i: number) => (
                <div key={day.title || i} className="border-l-4 border-amber-600 pl-6">
                  <h3 className="font-black uppercase text-amber-500 text-xs tracking-widest mb-3">{day.title || 'Day ' + (i + 1)}</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">{day.plan || day.description || day.content || ''}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {tab === 'gear-list' && (() => {
          const categories = asList(gearList);
          if (categories.length === 0) return <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300 leading-loose">{String(gearList || 'No gear list generated.')}</pre>;
          return (
            <div className="space-y-10">
              {categories.map((cat: any, i: number) => (
                <div key={cat.category || i}>
                  <h3 className="font-black uppercase text-amber-500 text-xs tracking-widest mb-4 border-b border-zinc-800 pb-2">{cat.category || 'Category ' + (i + 1)}</h3>
                  <div className="space-y-4">
                    {(cat.items || []).map((item: any, j: number) => (
                      <div key={j} className="flex gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                        <div>
                          <p className="font-black text-zinc-100 text-sm">{item.item}</p>
                          {item.reason && <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{item.reason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
