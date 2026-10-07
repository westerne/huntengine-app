// Species names as the app shows and stores them. "Deer" covers mule deer and
// whitetail — many states (NE, KS, OK, SD, ND, WA…) draw both, and the hunt's
// own description says which. "Mule Deer" is the old name; it's still accepted
// everywhere and stored as "Deer".

export const DEER = 'Deer';

export function normalizeSpecies(s: string): string;
export function normalizeSpecies(s: string | null | undefined): string | null;
export function normalizeSpecies(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  return /^mule\s*deer$/i.test(t) ? DEER : t;
}
