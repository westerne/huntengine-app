import type { DrawStat, Weapon } from './schema';

// "83.33%", "~100%", "<1%", "~0.5% or less" → number; "N/A", null → null.
export function parsePct(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

// Hunt-code method letter (CO: …R / …A / …M) → weapon.
export function weaponFromLetter(letter: string | undefined): Weapon | undefined {
  switch ((letter || '').toUpperCase()) {
    case 'R': return 'rifle';
    case 'A': return 'archery';
    case 'M': return 'muzzleloader';
    default: return undefined;
  }
}

export function sumKnown(values: Array<number | null | undefined>): number | null {
  const known = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
}

export function stat(partial: Partial<DrawStat>): DrawStat {
  return { tags: null, applicants: null, successPct: null, ...partial };
}
