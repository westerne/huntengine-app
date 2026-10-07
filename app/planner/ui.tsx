'use client';

// Shared form controls. Defined at module level (not inside the page) so React
// keeps them mounted between renders.

import type { ReactNode } from 'react';
import type { FlowStep } from './types';

export function ProgressBar({ steps, current }: { steps: readonly FlowStep[]; current: FlowStep }) {
  const currentIndex = steps.indexOf(current);
  if (currentIndex === -1) return null;
  return (
    <div className="flex gap-1 mb-8 max-w-xs mx-auto">
      {steps.map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentIndex ? 'bg-amber-500' : 'bg-zinc-800'}`} />
      ))}
    </div>
  );
}

export function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${
        active ? 'bg-amber-700 border-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
      }`}
    >
      {label}
    </button>
  );
}

// Yes/no preference switch.
export function ToggleSwitch({
  label, sublabel, value, onChange, warningLabel,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  warningLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-black rounded-xl border border-zinc-800">
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{label}</p>
        {sublabel && <p className="text-[9px] text-zinc-600 font-bold uppercase mt-0.5">{sublabel}</p>}
        {!value && warningLabel && (
          <p className="text-[9px] text-amber-600 font-bold uppercase mt-1">{warningLabel}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 ${value ? 'bg-amber-600' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

// Full-width option buttons (hunt style, experience, trophy vs opportunity).
export function ChoiceList<T extends string>({
  options, isActive, onPick,
}: {
  options: Array<{ value: T; label: string }>;
  isActive: (v: T) => boolean;
  onPick: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={isActive(o.value)}
          onClick={() => onPick(o.value)}
          className={`p-4 text-left rounded-xl border transition-all text-[10px] font-black uppercase tracking-[0.1em] ${isActive(o.value) ? 'bg-amber-900/20 border-amber-600 text-amber-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ResidencyPicker({ value, onPick }: { value: string; onPick: (r: string) => void }) {
  return (
    <div className="flex gap-4">
      {['Resident', 'Non-Resident'].map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onPick(r)}
          className={`flex-1 py-3 rounded-xl border font-black uppercase text-xs transition-all ${value === r ? 'bg-amber-700 border-amber-600 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children, className = 'mb-4' }: { children: ReactNode; className?: string }) {
  return <label className={`block text-[10px] font-black uppercase text-zinc-500 tracking-widest ${className}`}>{children}</label>;
}

// Back + primary action row at the bottom of each step.
export function StepNav({
  onBack, onNext, nextLabel = 'Next Step', primary = false, className = 'flex gap-4',
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  primary?: boolean;   // amber "submit" style for the last step
  className?: string;
}) {
  const nextCls = primary
    ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-xl shadow-amber-900/20'
    : 'bg-zinc-100 text-black hover:bg-amber-500';
  return (
    <div className={className}>
      {onBack && (
        <button type="button" onClick={onBack} className="flex-1 border-2 border-zinc-700 py-4 font-black rounded-xl hover:bg-zinc-800 uppercase tracking-widest text-xs">Back</button>
      )}
      <button type="button" onClick={onNext} className={`${onBack ? 'flex-[2]' : 'w-full'} py-4 font-black rounded-xl uppercase tracking-widest text-xs ${nextCls}`}>{nextLabel}</button>
    </div>
  );
}

export function PointsInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className: string }) {
  return (
    <input
      type="number"
      min={0}
      aria-label="Points held"
      className={className}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
    />
  );
}
