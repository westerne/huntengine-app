'use client';

// Shared form controls for the planner questionnaire, built on the design
// system (app/styles/hq.css, app/ui). Defined at module level (not inside the
// page) so React keeps them mounted between renders.

import type { CSSProperties, ReactNode } from 'react';
import type { FlowStep } from './types';
import { Button } from '../ui';

export function ProgressBar({ steps, current }: { steps: readonly FlowStep[]; current: FlowStep }) {
  const currentIndex = steps.indexOf(current);
  if (currentIndex === -1) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p className="hq-eyebrow">Step {currentIndex + 1} of {steps.length}</p>
      <div style={{ display: 'flex', gap: 4, maxWidth: 320 }} aria-hidden="true">
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              height: 4, flex: 1, borderRadius: 999,
              background: i <= currentIndex ? 'var(--brand)' : 'var(--border-strong)',
              transition: 'background .3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className="hq-chip" onClick={onClick} aria-pressed={active}>
      {label}
    </button>
  );
}

// A row of chips that wraps on narrow screens.
export function ChipRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>;
}

// The heading and body of one questionnaire step.
export function StepHeader({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div>
      <h2 className="hq-h2">{title}</h2>
      {intro && <p className="hq-body" style={{ marginTop: 4 }}>{intro}</p>}
    </div>
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
    <div className="hq-inset" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="hq-h3" style={{ fontSize: 15 }}>{label}</p>
        {sublabel && <p className="hq-small" style={{ marginTop: 2 }}>{sublabel}</p>}
        {!value && warningLabel && (
          <p className="hq-small" style={{ marginTop: 6, color: 'var(--fair)', fontWeight: 600 }}>{warningLabel}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        style={{
          position: 'relative', width: 48, height: 28, flex: 'none', borderRadius: 999, cursor: 'pointer',
          border: '1px solid var(--border-strong)',
          background: value ? 'var(--brand)' : 'var(--surface-sunk)',
          transition: 'background .2s',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3, left: value ? 23 : 3, width: 20, height: 20, borderRadius: '50%',
            background: value ? 'var(--on-brand)' : 'var(--ink-muted)', transition: 'left .2s',
          }}
        />
      </button>
    </div>
  );
}

// Full-width option buttons (hunt style, experience, trophy vs opportunity).
const choiceStyle: CSSProperties = {
  width: '100%', justifyContent: 'flex-start', textAlign: 'left',
  borderRadius: 'var(--r-md)', minHeight: 44, padding: '10px 14px', lineHeight: 1.35,
};
export function ChoiceList<T extends string>({
  options, isActive, onPick,
}: {
  options: Array<{ value: T; label: string }>;
  isActive: (v: T) => boolean;
  onPick: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="hq-chip"
          style={choiceStyle}
          aria-pressed={isActive(o.value)}
          onClick={() => onPick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const RESIDENCY_WORD: Record<string, string> = { Resident: 'Resident', 'Non-Resident': 'Non-resident' };
export function ResidencyPicker({ value, onPick }: { value: string; onPick: (r: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['Resident', 'Non-Resident'].map((r) => (
        <button
          key={r}
          type="button"
          className="hq-chip"
          style={{ flex: 1, justifyContent: 'center', minHeight: 44 }}
          aria-pressed={value === r}
          onClick={() => onPick(r)}
        >
          {RESIDENCY_WORD[r]}
        </button>
      ))}
    </div>
  );
}

// Label above a group of chips or options. Single inputs use a wrapping
// <label className="hq-field"> instead, so the label is tied to the control.
export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="hq-label" style={{ marginBottom: 8 }}>{children}</p>;
}

// Back + primary action row at the bottom of each step.
export function StepNav({
  onBack, onNext, nextLabel = 'Next step',
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  primary?: boolean; // kept for call sites: every step's forward action is the primary button
}) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {onBack && <Button type="button" variant="secondary" onClick={onBack} style={{ flex: 1 }}>Back</Button>}
      <Button type="button" onClick={onNext} style={{ flex: 2 }} block={!onBack}>{nextLabel}</Button>
    </div>
  );
}

export function PointsInput({ value, onChange, style }: { value: number; onChange: (n: number) => void; style?: CSSProperties }) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label="Points held"
      className="hq-input hq-data"
      style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', ...style }}
      value={value}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
    />
  );
}
