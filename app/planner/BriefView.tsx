'use client';

// Unit brief, hunt plan and gear list for one unit (the BRIEF / FULL_SUITE result).

/* eslint-disable @typescript-eslint/no-explicit-any */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Check } from 'lucide-react';
import type { FlowStep } from './types';
import { Button, Card } from '../ui';

// Leaflet touches `window`, so load the map client-side only.
const UnitMap = dynamic(() => import('../UnitMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 440, width: '100%', display: 'grid', placeItems: 'center', background: 'var(--surface-sunk)' }}>
      <p className="hq-small">Loading unit boundary…</p>
    </div>
  ),
});

export const BRIEF_TABS = ['unit-brief', 'hunt-plan', 'gear-list'] as const;
type BriefTab = (typeof BRIEF_TABS)[number];

const TAB_LABEL: Record<BriefTab, string> = { 'unit-brief': 'Unit brief', 'hunt-plan': 'Hunt plan', 'gear-list': 'Gear list' };
const TAB_HEADING: Record<BriefTab, string> = { 'unit-brief': 'Unit visualization', 'hunt-plan': 'Hunt plan', 'gear-list': 'Gear list' };

const asList = (v: any): any[] => (Array.isArray(v) ? v : typeof v === 'object' && v !== null ? Object.values(v) : []);

const prose = { fontFamily: 'inherit', margin: 0 } as const;

export default function BriefView({
  tab, onTab, unitBrief, huntPlan, gearList, map, save,
}: {
  tab: BriefTab;
  onTab: (t: FlowStep) => void;
  unitBrief: any;
  huntPlan: any;
  gearList: any;
  map: { unit: string; state: string; species: string };
  save?: { saved?: { id?: string; busy?: boolean; error?: string }; onSave: () => void; label: string; savedText: string };
}) {
  return (
    <div className="hq-stack hq-stack--lg hq-fade-up">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="tablist">
        {BRIEF_TABS.map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onTab(t)}
              className="hq-chip"
              style={on ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'var(--on-brand)' } : undefined}
            >
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      {save && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {save.saved?.id ? (
            <span className="hq-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} aria-hidden="true" />
              <Link href={`/season/${save.saved.id}`} className="hq-link">{save.savedText}</Link>
            </span>
          ) : (
            <Button type="button" disabled={save.saved?.busy} onClick={save.onSave}>
              {save.saved?.busy ? 'Saving…' : save.label}
            </Button>
          )}
          {save.saved?.error && <p role="alert" className="hq-err">{save.saved.error}</p>}
        </div>
      )}

      <h2 className="hq-h2">{TAB_HEADING[tab]}</h2>

      <Card>
        {tab === 'unit-brief' && (
          <div className="hq-stack hq-stack--lg">
            {/* Real unit boundary on satellite imagery. */}
            <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <UnitMap unit={map.unit} state={map.state} species={map.species} />
            </div>
            {typeof unitBrief === 'object' && unitBrief !== null ? (
              <div>
                {Object.entries(unitBrief).map(([key, value], i) => (
                  <section key={key} style={{ padding: '16px 0', borderTop: i > 0 ? '1px solid var(--divider)' : undefined }}>
                    <h3 className="hq-h3" style={{ marginBottom: 6 }}>{key}</h3>
                    <div className="hq-body hq-pre">
                      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <pre className="hq-body hq-pre" style={prose}>{unitBrief || 'No data available.'}</pre>
            )}
          </div>
        )}

        {tab === 'hunt-plan' && (() => {
          const days = asList(huntPlan);
          if (days.length === 0) return <pre className="hq-body hq-pre" style={prose}>{String(huntPlan || 'No plan generated.')}</pre>;
          return (
            <div className="hq-stack hq-stack--lg">
              {days.map((day: any, i: number) => (
                <section key={day.title || i} className="hq-quote hq-quote--brand">
                  <h3 className="hq-h3" style={{ marginBottom: 4 }}>{day.title || 'Day ' + (i + 1)}</h3>
                  <p className="hq-body">{day.plan || day.description || day.content || ''}</p>
                </section>
              ))}
            </div>
          );
        })()}

        {tab === 'gear-list' && (() => {
          const categories = asList(gearList);
          if (categories.length === 0) return <pre className="hq-body hq-pre" style={prose}>{String(gearList || 'No gear list generated.')}</pre>;
          return (
            <div className="hq-stack hq-stack--lg">
              {categories.map((cat: any, i: number) => (
                <section key={cat.category || i}>
                  <h3 className="hq-h3" style={{ paddingBottom: 6, borderBottom: '1px solid var(--divider)' }}>{cat.category || 'Category ' + (i + 1)}</h3>
                  <ul className="hq-list">
                    {(cat.items || []).map((item: any, j: number) => (
                      <li key={j} style={{ padding: '10px 0' }}>
                        <p style={{ fontWeight: 700, color: 'var(--ink)' }}>{item.item}</p>
                        {item.reason && <p className="hq-small" style={{ marginTop: 2 }}>{item.reason}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
