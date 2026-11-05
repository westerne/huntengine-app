'use client';

// "Your search" details shown (collapsed) under the SCOUT results.

import type { CSSProperties } from 'react';
import { Check, X } from 'lucide-react';
import type { PlannerFlags, Profile } from './types';
import { TROPHY_CONFIG } from './constants';

function Item({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p className="hq-label">{label}</p>
      <p className={accent ? 'hq-data' : undefined} style={{ fontSize: 14, fontWeight: 700, color: accent ? 'var(--data)' : 'var(--ink)', overflowWrap: 'anywhere' }}>{value}</p>
    </div>
  );
}

// A plain, non-interactive tag for a search setting.
const tagStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999,
  fontSize: 12, fontWeight: 600, border: '1px solid var(--border)',
  background: 'var(--surface-sunk)', color: on ? 'var(--ink)' : 'var(--ink-muted)',
});

const Flag = ({ on, children, icon }: { on: boolean; children: string; icon?: 'yes' | 'no' }) => (
  <span style={tagStyle(on)}>
    {icon === 'yes' && <Check size={12} aria-hidden="true" />}
    {icon === 'no' && <X size={12} aria-hidden="true" />}
    {children}
  </span>
);

export default function SearchSummary({ profile, flags }: { profile: Profile; flags: PlannerFlags }) {
  return (
    <div className="hq-stack" style={{ gap: 14 }}>
      <div className="hq-fields">
        <Item label="State / species" value={`${profile.states[0]} / ${profile.species}`} />
        <Item label="Residency" value={profile.residency} />
        <Item label="Points" value={flags.noPointSystem ? 'Random draw' : `${profile.points[flags.selState] || 0} pts`} accent />
        <Item label="Weapon / season" value={`${profile.weapons.join(', ') || 'Any weapon'} / ${profile.seasons.join(', ') || 'Any season'}`} />
        <Item label="Trophy floor" value={TROPHY_CONFIG[profile.species] ? `${profile.trophyQuality}"` : 'Any'} accent />
        <Item label="Style / fitness" value={`${profile.huntStyles.join(', ')} / ${profile.fitness}`} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {flags.showSpecialDrawOption && (
          <Flag on={profile.includeSpecialDraw} icon={profile.includeSpecialDraw ? 'yes' : 'no'}>{profile.includeSpecialDraw ? 'Special draw included' : 'Special draw excluded'}</Flag>
        )}
        {flags.showGrizzlyOption && (
          <Flag on={!profile.grizzlyComfort} icon={profile.grizzlyComfort ? 'yes' : 'no'}>{profile.grizzlyComfort ? 'Grizzly country OK' : 'No grizzly units'}</Flag>
        )}
        {profile.knownAreas && (
          <Flag on>{`Familiar: ${profile.knownAreas.slice(0, 30)}${profile.knownAreas.length > 30 ? '…' : ''}`}</Flag>
        )}
        <Flag on={false}>{`Timeline: ${profile.drawTimeline}`}</Flag>
      </div>
    </div>
  );
}
