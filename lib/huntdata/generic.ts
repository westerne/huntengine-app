import type { DrawStat, Hunt, Residency, SpeciesKey, StateModule, Weapon } from './schema';

// Default SCOUT and BRIEF data for any state module that doesn't have its own
// hand-tuned builder in app/api/strategy. A new state only has to produce
// Hunt[]; these turn it into what the prompts need.

const pick = (h: Hunt, r: Residency): DrawStat | null =>
  r === 'resident' ? h.draw.resident : h.draw.nonresident;

const range = (a: number[]) => (a.length ? (Math.min(...a) === Math.max(...a) ? `${a[0]}%` : `${Math.min(...a)}-${Math.max(...a)}%`) : 'n/a');

export function huntsForWeapon(hunts: Hunt[], weapon: Weapon | 'any'): Hunt[] {
  if (weapon === 'any') return hunts;
  // Keep hunts whose weapon is unknown — dropping them would hide real options.
  return hunts.filter((h) => !h.weapon || h.weapon === 'any' || h.weapon === weapon);
}

// One entry per unit (SCOUT ranks units; one row per hunt code blows the token budget).
export function buildGenericScoutDataset(
  mod: StateModule,
  species: SpeciesKey,
  residency: Residency,
  weapon: Weapon | 'any' = 'any',
): Array<Record<string, unknown>> {
  const byUnit = new Map<string, Hunt[]>();
  for (const h of huntsForWeapon(mod.hunts(species), weapon)) {
    byUnit.set(h.unit, [...(byUnit.get(h.unit) ?? []), h]);
  }
  return [...byUnit.entries()].map(([unit, hunts]) => {
    const odds = hunts.map((h) => pick(h, residency)?.successPct).filter((v): v is number => v != null);
    const minPts = hunts.map((h) => pick(h, residency)?.minPoints).filter((v): v is number => v != null);
    const harvest = hunts.map((h) => h.harvest?.successPct).filter((v): v is number => v != null);
    return {
      unit,
      huntCodes: hunts.slice(0, 6).map((h) => h.huntCode),
      huntCount: hunts.length,
      drawSuccess: range(odds),
      bestDrawSuccess: odds.length ? Math.max(...odds) : null,
      fewestPointsToDraw: minPts.length ? Math.min(...minPts) : null,
      otc: hunts.some((h) => h.otc),
      harvestSuccess: harvest.length ? range(harvest) : null,
      dataYear: hunts.find((h) => h.drawYear != null)?.drawYear ?? null,
      estimated: hunts.some((h) => h.dataQuality === 'estimated'),
    };
  });
}

function statLine(label: string, s: DrawStat | null): string {
  if (!s) return '';
  const parts = [
    s.tags != null ? `${s.tags} tags` : '',
    s.applicants != null ? `${s.applicants} first-choice applicants` : '',
    s.successPct != null ? `draw success ${s.successPct}%` : '',
    s.minPoints != null ? `fewest points that drew: ${s.minPoints}` : '',
  ].filter(Boolean);
  return parts.length ? `${label}: ${parts.join(', ')}` : '';
}

// BRIEF draw block for one unit, in the same "source of truth" style as the
// hand-written state blocks in route.ts.
export function buildGenericDrawSummary(
  mod: StateModule,
  species: SpeciesKey,
  speciesLabel: string,
  unit: string,
  residency: Residency,
): string {
  const norm = (u: string) => u.trim().toLowerCase().replace(/^0+(?=\d)/, '');
  const hunts = mod.hunts(species).filter((h) => norm(h.unit) === norm(unit));
  const rules = mod.rulesVerified ? `DRAW SYSTEM: ${mod.drawSystemNote}` : `Confirm draw rules with ${mod.agency.name}.`;

  if (!hunts.length) {
    return `
          ### ${mod.name} DRAW — Unit ${unit} ${speciesLabel} ###
          No draw data was found for ${speciesLabel} in unit ${unit}. ${rules}
          Do NOT fabricate draw odds or point requirements; advise checking ${mod.agency.name} (${mod.agency.url}).
          ###########################################
        `;
  }

  const who = residency === 'resident' ? 'Resident' : 'Non-resident';
  const lines = hunts.slice(0, 12).map((h) => {
    const s = statLine(who, residency === 'resident' ? h.draw.resident : h.draw.nonresident);
    const harvest = h.harvest ? `; hunter success ${h.harvest.successPct}% (${h.harvest.year})` : '';
    return `- Hunt ${h.huntCode}${h.label ? ` (${h.label})` : ''}${h.otc ? ': over the counter, no draw' : s ? `: ${s}` : ': no draw numbers published'}${harvest}.`;
  }).join('\n');
  const year = hunts.find((h) => h.drawYear != null)?.drawYear;
  const estimated = hunts.some((h) => h.dataQuality === 'estimated')
    ? 'Some figures are ESTIMATES, not official results — say so when you use them.'
    : '';

  return `
          ### ${mod.name} DRAW DATA${year ? ` (${year})` : ''} — Unit ${unit} ${speciesLabel} ###
          Use these exact numbers; do not invent others:
          ${lines}
          ${rules}
          ${estimated}
          ###########################################
        `;
}
