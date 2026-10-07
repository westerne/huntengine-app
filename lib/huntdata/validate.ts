import type { DrawStat, Hunt } from './schema';

export type DataProblem = { huntCode: string; problem: string };

const pctOk = (v: number | null | undefined) => v == null || (Number.isFinite(v) && v >= 0 && v <= 100);
const countOk = (v: number | null | undefined) => v == null || (Number.isInteger(v) && v >= 0);

function checkStat(prefix: string, s: DrawStat | null, out: string[]) {
  if (!s) return;
  if (!pctOk(s.successPct)) out.push(`${prefix} successPct ${s.successPct} is outside 0–100`);
  if (!countOk(s.tags)) out.push(`${prefix} tags ${s.tags} is not a whole number ≥ 0`);
  if (!countOk(s.applicants)) out.push(`${prefix} applicants ${s.applicants} is not a whole number ≥ 0`);
  // Points can be fractional (Nebraska landowner elk prints levels like 0.9).
  if (s.minPoints != null && !(Number.isFinite(s.minPoints) && s.minPoints >= 0)) out.push(`${prefix} minPoints ${s.minPoints} is not a number ≥ 0`);
  for (const p of s.pools ?? []) checkStat(`${prefix} ${p.name} pool`, p, out);
}

// Structural checks every state's data must pass before SCOUT or BRIEF sees it.
export function validateHunts(hunts: Hunt[]): DataProblem[] {
  const problems: DataProblem[] = [];
  const seen = new Set<string>();
  const thisYear = new Date().getFullYear();

  for (const h of hunts) {
    const out: string[] = [];
    if (!h.huntCode?.trim()) out.push('missing huntCode');
    if (!h.unit?.trim()) out.push('missing unit');
    const key = `${h.species}:${h.huntCode}`;
    if (seen.has(key)) out.push('duplicate huntCode');
    seen.add(key);
    if (h.drawYear != null && (h.drawYear < 2015 || h.drawYear > thisYear + 1)) out.push(`drawYear ${h.drawYear} looks wrong`);
    if (h.dataQuality === 'official' && h.drawYear == null) out.push('official data needs a drawYear');
    // Combined (not split by residency) tags/applicants count as draw data.
    if (!h.otc && !h.draw.resident && !h.draw.nonresident && h.tags == null && h.applicants == null) out.push('no draw data for either residency');
    if (!countOk(h.tags)) out.push(`tags ${h.tags} is not a whole number ≥ 0`);
    if (!countOk(h.applicants)) out.push(`applicants ${h.applicants} is not a whole number ≥ 0`);
    checkStat('resident', h.draw.resident, out);
    checkStat('nonresident', h.draw.nonresident, out);
    if (h.harvest && (!pctOk(h.harvest.successPct) || h.harvest.year < 2015)) out.push('harvest data out of range');
    for (const p of out) problems.push({ huntCode: h.huntCode, problem: p });
  }
  return problems;
}
