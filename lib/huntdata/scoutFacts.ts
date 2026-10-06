// For states on the shared builders, the AI chooses hunts and explains them,
// but the facts on each card — odds and tier — come from the data, not the
// model. Recommendations must name a dataset huntCode; anything else is dropped.

type Entry = Record<string, unknown> & { huntCode?: unknown; drawSuccess?: unknown; drawSuccessAtYourPoints?: unknown };
type Pick = Record<string, unknown> & { huntCode?: unknown };

export type Tier = 'DRAW_NOW' | 'RANDOM_PLAY' | 'BUILD_AND_WAIT' | 'LONG_GAME';

// Same thresholds the prompt describes.
// In a pure random draw (no points) there is nothing to build toward, so
// anything under 15% is simply a long shot.
export function tierFor(oddsPct: number | null, hasPoints = true): Tier {
  if (oddsPct == null) return hasPoints ? 'BUILD_AND_WAIT' : 'LONG_GAME';
  if (oddsPct >= 50) return 'DRAW_NOW';
  if (oddsPct >= 15) return 'RANDOM_PLAY';
  if (oddsPct >= 2 && hasPoints) return 'BUILD_AND_WAIT';
  return 'LONG_GAME';
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// The pick's hunt code: the huntCode field, else the first "Hunt 3011" the
// model wrote in its text fields, if that code is in the dataset.
function codeOf(p: Pick, known: Map<string, Entry>): string | null {
  if (p.huntCode != null && known.has(String(p.huntCode))) return String(p.huntCode);
  for (const v of Object.values(p)) {
    if (typeof v !== 'string') continue;
    for (const m of v.matchAll(/\bhunt\s*#?\s*([A-Z0-9-]{3,})/gi)) {
      if (known.has(m[1])) return m[1];
    }
  }
  return null;
}

export function applyHuntFacts<T extends { recommendations?: Pick[]; drawableUnits?: Pick[] }>(
  result: T,
  dataset: Entry[],
): { result: T; dropped: string[] } {
  const byCode = new Map(dataset.map((e) => [String(e.huntCode), e]));
  const dropped: string[] = [];

  const fill = (list: Pick[] | undefined) =>
    list?.flatMap((p) => {
      const code = codeOf(p, byCode);
      const e = code ? byCode.get(code) : undefined;
      if (!e) {
        dropped.push(String(p.huntCode ?? p.unit ?? '?'));
        return [];
      }
      const atPts = num(e.drawSuccessAtYourPoints);
      const odds = atPts ?? num(e.drawSuccess);
      const year = e.dataYear ? ` (${e.dataYear} draw` : ' (last draw';
      return [{
        ...p,
        unit: e.unit,
        huntCode: e.huntCode,
        currentOdds: odds == null
          ? 'No published odds'
          : `${odds}%${year}${atPts != null ? ', at your points)' : ', first choice)'}`,
        tier: tierFor(odds),
      }];
    });

  return {
    result: { ...result, recommendations: fill(result.recommendations), drawableUnits: fill(result.drawableUnits) },
    dropped,
  };
}
