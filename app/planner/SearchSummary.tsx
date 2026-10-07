'use client';

// "Your search" details shown (collapsed) under the SCOUT results.

import type { PlannerFlags, Profile } from './types';
import { TROPHY_CONFIG } from './constants';

function Item({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[8px] uppercase text-zinc-600 font-black tracking-widest mb-1">{label}</p>
      <p className={`text-xs font-black uppercase ${accent ? 'text-amber-400' : 'text-zinc-200'}`}>{value}</p>
    </div>
  );
}

const Flag = ({ on, children, tone }: { on: boolean; children: string; tone: 'amber' | 'red' | 'blue' | 'zinc' }) => {
  const cls = {
    amber: 'bg-amber-900/20 border-amber-800/40 text-amber-400',
    red: 'bg-red-900/20 border-red-800/40 text-red-400',
    blue: 'bg-blue-900/20 border-blue-800/40 text-blue-400',
    zinc: 'bg-zinc-800 border-zinc-700 text-zinc-400',
  }[on ? tone : 'zinc'];
  return <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${cls}`}>{children}</span>;
};

export default function SearchSummary({ profile, flags }: { profile: Profile; flags: PlannerFlags }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
      <p className="text-[9px] uppercase text-zinc-500 font-black tracking-widest mb-4">Your Search Parameters</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <Item label="State / Species" value={`${profile.states[0]} / ${profile.species}`} />
        <Item label="Residency" value={profile.residency} />
        <Item label="Points" value={flags.noPointSystem ? 'Random Draw' : `${profile.points[flags.selState] || 0} pts`} accent />
        <Item label="Weapon / Season" value={`${profile.weapons.join(', ') || 'Any weapon'} / ${profile.seasons.join(', ') || 'Any season'}`} />
        <Item label="Trophy Floor" value={TROPHY_CONFIG[profile.species] ? `${profile.trophyQuality}"` : 'Any'} accent />
        <Item label="Style / Fitness" value={`${profile.huntStyles.join(', ')} / ${profile.fitness}`} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {flags.showSpecialDrawOption && (
          <Flag on={profile.includeSpecialDraw} tone="amber">{profile.includeSpecialDraw ? '✓ Special Draw Included' : '✕ Special Draw Excluded'}</Flag>
        )}
        {flags.showGrizzlyOption && (
          <Flag on={!profile.grizzlyComfort} tone="red">{profile.grizzlyComfort ? '✓ Grizzly Country OK' : '✕ No Grizzly Units'}</Flag>
        )}
        {profile.knownAreas && (
          <Flag on tone="blue">{`Familiar: ${profile.knownAreas.slice(0, 30)}${profile.knownAreas.length > 30 ? '...' : ''}`}</Flag>
        )}
        <Flag on={false} tone="zinc">{`Timeline: ${profile.drawTimeline}`}</Flag>
      </div>
    </div>
  );
}
