import type { DrawStat, Hunt, Residency, SpeciesKey, StateModule, Weapon } from './schema';

// Default SCOUT and BRIEF data for any state module that doesn't have its own
// hand-tuned builder in app/api/strategy. A new state only has to produce
// Hunt[]; these turn it into what the prompts need.

const pick = (h: Hunt, r: Residency): DrawStat | null =>
  r === 'resident' ? h.draw.resident : h.draw.nonresident;

export function huntsForWeapon(hunts: Hunt[], weapon: Weapon | 'any'): Hunt[] {
  if (weapon === 'any') return hunts;
  // Keep hunts whose weapon is unknown — dropping them would hide real options.
  return hunts.filter((h) => !h.weapon || h.weapon === 'any' || h.weapon === weapon);
}

// Draw success for applicants holding exactly `points` (from the agency's
// point table). Above the table's top level, use the top level.
export function pointLineAt(h: Hunt, residency: Residency, points: number) {
  const lines = h.pointLines?.[residency];
  if (!lines?.length) return null;
  const top = Math.max(...lines.map((l) => l.points));
  const line = lines.find((l) => l.points === Math.min(points, top));
  return line && line.applicants > 0 ? line : null;
}

export function successAtPoints(h: Hunt, residency: Residency, points: number): number | null {
  const line = pointLineAt(h, residency, points);
  return line ? Math.round((1000 * line.drawn) / line.applicants) / 10 : null;
}

// One entry per HUNT, not per unit: a unit holds bull, cow, youth and archery
// hunts with nothing in common, and aggregating them gave "0-100%" odds.
// Hunts are already filtered to the hunter's weapon.
export function buildGenericScoutDataset(
  mod: StateModule,
  species: SpeciesKey,
  residency: Residency,
  weapon: Weapon | 'any' = 'any',
  hunterPoints?: number,
): Array<Record<string, unknown>> {
  return huntsForWeapon(mod.hunts(species), weapon).map((h) => {
    const s = pick(h, residency);
    return {
      unit: h.unit,
      huntCode: h.huntCode,
      label: h.label ?? null,
      weapon: h.weapon ?? null,
      tags: s?.tags ?? h.tags ?? null,
      applicants: s?.applicants ?? null,
      drawSuccess: s?.successPct ?? null,
      drawSuccessAtYourPoints: hunterPoints == null ? null : successAtPoints(h, residency, hunterPoints),
      atYourPoints: hunterPoints == null ? null : pointLineAt(h, residency, hunterPoints),
      fewestPointsToDraw: s?.minPoints ?? null,
      otc: !!h.otc,
      hunterSuccess: h.harvest ? `${h.harvest.successPct}%` : null,
      hunterSuccessYear: h.harvest?.year ?? null,
      hunterSuccessScope: h.harvest?.scope ?? null,
      dataYear: h.drawYear,
      estimated: h.dataQuality === 'estimated',
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
  hunterPoints?: number,
  huntCode?: string,
): string {
  const norm = (u: string) => u.trim().toLowerCase().replace(/^0+(?=\d)/, '');
  // The hunter's chosen hunt (from a SCOUT card) leads; the unit's other hunts follow.
  const hunts = mod.hunts(species)
    .filter((h) => norm(h.unit) === norm(unit) || h.huntCode === huntCode)
    .sort((a, b) => Number(b.huntCode === huntCode) - Number(a.huntCode === huntCode));
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
    const atPts = hunterPoints == null ? null : successAtPoints(h, residency, hunterPoints);
    const pts = atPts == null ? '' : `; applicants with ${hunterPoints} points drew at ${atPts}%`;
    const mine = h.huntCode === huntCode ? " — THE HUNTER'S HUNT; focus the brief on this one" : '';
    return `- Hunt ${h.huntCode}${h.label ? ` (${h.label})` : ''}${mine}${h.otc ? ': over the counter, no draw' : s ? `: ${s}` : ': no draw numbers published'}${pts}${harvest}.`;
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
