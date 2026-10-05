// Keeps SCOUT honest: the model may only recommend units that exist in the
// dataset it was given. Anything else is dropped before it reaches the hunter.

// "Unit 7", "GMU 007", "HD 100", "Area 57-1" → "7", "7", "100", "57-1"
export function normalizeUnit(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^(unit|gmu|hd|hunting district|district|area|hunt area)\s*/, '')
    .replace(/\s+/g, '')
    .replace(/^0+(?=\d)/, '');
}

// First unit-like token in free text: "Unit 12 (OTC archery)" → "12".
function firstUnitToken(raw: unknown): string | null {
  const m = String(raw ?? '').match(/\d+[a-z0-9]*(?:-[a-z0-9]+)*/i);
  return m ? normalizeUnit(m[0]) : null;
}

type DatasetEntry = { unit?: unknown; notableUnits?: Array<{ unitName?: unknown }> };

type ScoutResult = {
  recommendations?: Array<{ unit?: unknown }>;
  drawableUnits?: Array<{ unit?: unknown }>;
  [k: string]: unknown;
};

export function knownUnits(dataset: DatasetEntry[]): Set<string> {
  const known = new Set<string>();
  for (const e of dataset) {
    known.add(normalizeUnit(e.unit));
    // WY deer regions nest their named units; the model may cite those.
    for (const n of e.notableUnits ?? []) known.add(normalizeUnit(n.unitName));
  }
  known.delete('');
  return known;
}

export function isKnownUnit(unit: unknown, known: Set<string>): boolean {
  if (known.has(normalizeUnit(unit))) return true;
  const token = firstUnitToken(unit);
  return token != null && known.has(token);
}

export function filterToKnownUnits<T extends ScoutResult>(
  result: T,
  dataset: DatasetEntry[],
): { result: T; dropped: string[] } {
  const known = knownUnits(dataset);
  // Nothing to check against — pass through rather than drop everything.
  if (known.size === 0) return { result, dropped: [] };

  const dropped: string[] = [];
  const keep = <E extends { unit?: unknown }>(list: E[] | undefined): E[] | undefined =>
    list?.filter((e) => {
      const ok = isKnownUnit(e.unit, known);
      if (!ok) dropped.push(String(e.unit));
      return ok;
    });

  return {
    result: { ...result, recommendations: keep(result.recommendations), drawableUnits: keep(result.drawableUnits) },
    dropped,
  };
}
