// SCOUT response for states on the shared builders (Arizona onward).
//
// The server builds every card from the shortlist — unit, hunt code, odds,
// tier, season and trophy placeholders come from data. The model only writes
// explanations keyed by hunt code, plus the summary and action plan. A hunt
// the model skipped still gets a card, explained from its data alone.

import { tierFor, type Tier } from './scoutFacts';

type Entry = Record<string, unknown>;

export type ModelExplanations = {
  summary?: string;
  strategyPath?: Tier;
  actionPlan?: { headline?: string; steps?: string[]; pointBankingAdvice?: string };
  explanations?: Record<string, { whyItFits?: string; tradeoffs?: string; accessRating?: string; pressureRating?: string }>;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// Point-table odds cover every pass, so any claim about WHICH pass a hunter
// draws in ("strong chance in the bonus pass") is unsupported. The model kept
// making it despite the prompt rule, so drop those sentences.
const PASS_CLAIM = /\b(bonus|random|max(imum)?[- ]point|first|second|1st|2nd)[- ](pass|draw|round)\b/i;
export function stripPassClaims(text: string | undefined): string {
  if (!text) return '';
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !(PASS_CLAIM.test(s) && /\b(chance|odds|likely|draw(n)?|position(ed)?)\b/i.test(s)))
    .join(' ')
    .trim();
}

function odds(e: Entry): { pct: number | null; text: string } {
  const atPts = num(e.drawSuccessAtYourPoints);
  const pct = atPts ?? num(e.drawSuccess);
  const yr = e.dataYear ? `${e.dataYear} draw` : 'last draw';
  if (e.otc) return { pct: 100, text: 'Over the counter — no draw' };
  if (pct == null) return { pct: null, text: 'No published odds' };
  const line = e.atYourPoints as { drawn: number; applicants: number; points: number } | null | undefined;
  // A bare "0%" reads like missing data; say how many tried.
  if (atPts === 0 && line) return { pct, text: `0 of ${line.applicants} applicants at your points drew (${yr})` };
  return { pct, text: `${pct}% (${yr}, ${atPts != null ? 'at your points' : 'first choice'})` };
}

const TIER_ORDER: Tier[] = ['DRAW_NOW', 'RANDOM_PLAY', 'BUILD_AND_WAIT', 'LONG_GAME'];

const WEAPON_LABEL: Record<string, string> = { rifle: 'Rifle', archery: 'Archery', muzzleloader: 'Muzzleloader', any: 'Any weapon' };

// Plain explanation from data only, for hunts the model didn't cover.
function dataOnlyWhy(e: Entry, o: { text: string }): string {
  const hs = e.hunterSuccess ? ` Hunter success was ${e.hunterSuccess} in ${e.hunterSuccessYear}.` : ' No hunter-success figure is published for this hunt.';
  return `Hunt ${e.huntCode}${e.label ? ` (${e.label})` : ''}: ${o.text}.${hs}`;
}

export function buildSharedScoutResponse(
  shortlist: Entry[],
  model: ModelExplanations,
  ctx: { stateLabel: string; weaponLabel: string; hasPoints?: boolean },
) {
  const recs = shortlist.map((e) => {
    const o = odds(e);
    const tier = tierFor(o.pct, ctx.hasPoints ?? true);
    const x = model.explanations?.[String(e.huntCode)] ?? {};
    return {
      unit: String(e.unit),
      huntCode: String(e.huntCode),
      state: ctx.stateLabel,
      typicalScore: 'Not in data',
      topEnd: 'Not in data',
      drawFeasibility: o.text,
      currentOdds: o.text,
      predictedOdds: 'Not forecast',
      oddsDirection: 'STABLE' as const,
      season: `${WEAPON_LABEL[String(e.weapon)] ?? ctx.weaponLabel} — see ${ctx.stateLabel} regulations for dates`,
      terrain: 'See unit map',
      accessRating: x.accessRating ?? '—',
      pressureRating: x.pressureRating ?? '—',
      totalScore: 0,
      tier,
      whyItFits: stripPassClaims(x.whyItFits) || dataOnlyWhy(e, o),
      tradeoffs: stripPassClaims(x.tradeoffs) || (x.whyItFits ? '' : 'No AI write-up for this hunt — figures shown are from agency data only.'),
      _odds: o.pct,
    };
  });

  // Best first: by tier, then odds.
  recs.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || (b._odds ?? -1) - (a._odds ?? -1));
  const recommendations = recs.map(({ _odds, ...r }) => r); // eslint-disable-line @typescript-eslint/no-unused-vars

  const drawNow = recommendations.filter((r) => r.tier === 'DRAW_NOW');
  const fair = recommendations.filter((r) => r.tier === 'RANDOM_PLAY');
  const best = recommendations[0];

  return {
    drawReality: {
      regularPoolUnits: drawNow.length,
      randomPoolUnits: fair.length,
      pointsToNextUnit: 0,
      bestLimitedUnit: best ? `${best.unit} (hunt ${best.huntCode})` : '',
      summary: stripPassClaims(model.summary),
    },
    strategyPath: model.strategyPath && TIER_ORDER.includes(model.strategyPath) ? model.strategyPath : (best?.tier ?? 'BUILD_AND_WAIT'),
    actionPlan: {
      headline: model.actionPlan?.headline ?? '',
      steps: model.actionPlan?.steps ?? [],
      randomPoolPlays: fair.map((r) => `Unit ${r.unit} — hunt ${r.huntCode}`),
      // No point system → no point-banking advice.
      pointBankingAdvice: ctx.hasPoints === false ? '' : model.actionPlan?.pointBankingAdvice ?? '',
    },
    drawableUnits: drawNow.map((r) => ({
      unit: r.unit, huntCode: r.huntCode, state: r.state, typicalScore: r.typicalScore, topEnd: r.topEnd,
      currentOdds: r.currentOdds, poolType: 'Regular', season: r.season, terrain: r.terrain,
      wildernessStatus: 'NONE', wildernessNote: '', grizzlyPresence: false, tier: r.tier,
    })),
    recommendations,
  };
}
