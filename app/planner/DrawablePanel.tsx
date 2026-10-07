'use client';
import { huntTitle } from '@/lib/huntName';

// Slide-over list of every unit the hunter can likely draw now.

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DrawablePanel({
  units, stateCode, onClose, onPick,
}: {
  units: any[];
  stateCode: string;
  onClose: () => void;
  onPick: (unit: any) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-start justify-end" role="dialog" aria-modal="true" aria-label="Units you can draw now">
      <div className="h-full w-full max-w-xl bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-1">All Drawable Units</p>
            <h3 className="text-xl font-black italic uppercase text-green-400">{units.length} Units You Can Draw Now</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-2xl font-black leading-none">×</button>
        </div>

        {/* Pool type legend */}
        <div className="px-8 py-3 border-b border-zinc-800 flex gap-4 shrink-0">
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Regular Pool</span>
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Special Pool</span>
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-zinc-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />OTC / General</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {units.map((unit: any, i: number) => (
            <button
              key={`${unit.unit}-${unit.huntCode ?? i}`}
              type="button"
              onClick={() => onPick(unit)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-amber-700 hover:bg-zinc-800/60 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${unit.poolType === 'OTC' ? 'bg-blue-500' : unit.poolType === 'Special' ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">{unit.state || stateCode}</span>
                    <span className="text-[9px] text-zinc-600 font-black uppercase">{unit.poolType}</span>
                  </div>
                  <p className="text-lg font-black italic uppercase text-white leading-tight truncate">
                    {huntTitle(unit.unit, unit.huntCode)}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate">{unit.terrain}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {unit.requiresGuide && (
                      <span className="text-[8px] font-black uppercase text-orange-400 border border-orange-800/40 bg-orange-900/20 px-2 py-0.5 rounded-full">Guide Req.</span>
                    )}
                    {unit.grizzlyPresence && (
                      <span className="text-[8px] font-black uppercase text-yellow-500 border border-yellow-800/40 bg-yellow-900/20 px-2 py-0.5 rounded-full">🐻 Grizzly</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] uppercase text-zinc-600 font-black mb-0.5">Odds</p>
                  <p className="text-lg font-black text-green-400">{unit.currentOdds}</p>
                  <p className="text-[9px] text-zinc-500 font-bold">{unit.topEnd}</p>
                  <p className="text-[8px] text-zinc-600 font-black uppercase mt-1 group-hover:text-amber-500 transition-colors">Build Plan →</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-8 py-4 border-t border-zinc-800 shrink-0">
          <p className="text-[9px] text-zinc-600 font-bold uppercase text-center">Tap any unit to build a full tactical plan</p>
        </div>
      </div>
    </div>
  );
}
