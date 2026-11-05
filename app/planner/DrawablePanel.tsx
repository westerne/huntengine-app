'use client';
import { ArrowRight, X } from 'lucide-react';
import { huntTitle } from '@/lib/huntName';
import { trophyFigureOrNull } from '@/lib/trophy';
import { Button, Card, Eyebrow, Tier } from '../ui';

// Slide-over list of every unit the hunter can likely draw now.

/* eslint-disable @typescript-eslint/no-explicit-any */

const poolWord = (poolType: unknown) =>
  poolType === 'OTC' ? 'OTC / general' : poolType === 'Special' ? 'Special pool' : 'Regular pool';

export default function DrawablePanel({
  units, stateCode, onClose, onPick,
}: {
  units: any[];
  stateCode: string;
  onClose: () => void;
  onPick: (unit: any) => void;
}) {
  return (
    <div
      className="hq"
      role="dialog"
      aria-modal="true"
      aria-label="Units you can draw now"
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end',
        background: 'var(--scrim)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="hq-fade-up"
        style={{
          height: '100%', width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column',
          background: 'var(--canvas)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '20px 16px 14px', borderBottom: '1px solid var(--divider)', flex: 'none' }}>
          <div style={{ minWidth: 0 }}>
            <Eyebrow>All drawable units</Eyebrow>
            <h2 className="hq-h2" style={{ marginTop: 4 }}>{units.length} units you can draw now</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <Card variant="flat" style={{ padding: '4px 16px' }}>
            <ul className="hq-list">
              {units.map((unit: any, i: number) => {
                const top = trophyFigureOrNull(unit.topEnd);
                return (
                  <li key={`${unit.unit}-${unit.huntCode ?? i}`}>
                    <button type="button" className="hq-row" onClick={() => onPick(unit)} style={{ alignItems: 'flex-start' }}>
                      <span className="hq-badge">{unit.state || stateCode}</span>
                      <span className="hq-row__main">
                        <span className="hq-row__title">{huntTitle(unit.unit, unit.huntCode)}</span>
                        <span className="hq-row__sub">{[poolWord(unit.poolType), unit.terrain].filter(Boolean).join(' · ')}</span>
                        {(unit.requiresGuide || unit.grizzlyPresence) && (
                          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {unit.requiresGuide && <Tier tier="fair">Guide required</Tier>}
                            {unit.grizzlyPresence && <Tier tier="fair">Grizzly country</Tier>}
                          </span>
                        )}
                      </span>
                      <span style={{ flex: 'none', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 110 }}>
                        <span className="hq-small">Odds</span>
                        <span className="hq-data" style={{ fontWeight: 700 }}>{unit.currentOdds}</span>
                        {top && <span className="hq-small">Top end {top}</span>}
                      </span>
                      <ArrowRight size={16} className="hq-row__chev" aria-hidden="true" style={{ marginTop: 4 }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <p className="hq-small" style={{ padding: '12px 16px', borderTop: '1px solid var(--divider)', textAlign: 'center', flex: 'none' }}>
          Tap any unit to build a full plan for it.
        </p>
      </div>
    </div>
  );
}
