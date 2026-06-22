// Parse the 5 WGFD 2025 deer demand reports (dumped to /tmp/pdftools/*.txt)
// and derive DrawYearData for target LIMITED_QUOTA tags.
//
// Methodology (validated against existing hand-entered 141-1):
//  Simple pools (resident, nr_random, nr_special_random): one row per area+type
//    -> quota, firstChoiceApplicants, approxOdds = quota/firstChoice.
//  Pref-point pools (nr_regular, nr_special): multi-row tier blocks
//    -> minPoints = integer of the LAST tier with odds > 0% (marginal tier)
//    -> oddsAtMin = that tier's odds
//    -> notes = first 0%-odds tier: "{applicants} applicants shut out below {n} pts"
import { readFileSync } from 'fs';

// The dumped *.txt reports live alongside this script (run from the temp dir).
const DIR = import.meta.dirname;
const txt = (n) => readFileSync(`${DIR}/${n}.txt`, 'utf8').split('\n');

// area+type key e.g. "010-1" -> "10-1"
const norm = (area, type) => `${parseInt(area, 10)}-${type}`;

// ── Simple pools: area type desc quota first second third ──────────────────────
function parseSimple(lines) {
  const out = {};
  for (const l of lines) {
    const m = l.match(/^(\d{3})\s+(\d)\s+.+?\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (!m) continue;
    const [, area, type, quota, first] = m;
    out[norm(area, type)] = { quota: +quota, firstChoiceApplicants: +first };
  }
  return out;
}

// ── Pref-point pools: tier blocks ──────────────────────────────────────────────
// Row (right-anchored): remaining issued prefPointsLabel applicants odds%
const tierRe = /(\d+)\s+(\d+)\s+(<=?\s*\d+|\d+)\s+(\d+)\s+(\d+\.\d+)%\s*$/;
const startRe = /^(\d{3})\s+(\d)\s+/;
const ptInt = (label) => parseInt(label.replace(/[^0-9]/g, ''), 10);

function parsePref(lines) {
  const blocks = {};
  let curKey = null;
  for (const l of lines) {
    const s = l.match(startRe);
    if (s) curKey = norm(s[1], s[2]);
    if (!curKey) continue;
    const t = l.match(tierRe);
    if (!t) continue;
    const [, remaining, issued, ptLabel, applicants, odds] = t;
    (blocks[curKey] ||= { quota: null, tiers: [] });
    // quota = the remaining-quota figure on the FIRST tier row of the block
    if (blocks[curKey].quota === null && s) blocks[curKey].quota = +remaining;
    blocks[curKey].tiers.push({
      ptLabel: ptLabel.replace(/\s+/g, ''),
      ptInt: ptInt(ptLabel),
      applicants: +applicants,
      odds: parseFloat(odds),
    });
  }
  const out = {};
  for (const [key, b] of Object.entries(blocks)) {
    const positive = b.tiers.filter(t => t.odds > 0);
    const marginal = positive[positive.length - 1] ?? null;        // last odds>0 tier
    const firstZero = b.tiers.find(t => t.odds === 0) ?? null;     // first shut-out tier
    out[key] = {
      quota: b.quota,
      minPoints: marginal ? marginal.ptInt : null,
      oddsAtMin: marginal ? marginal.odds.toFixed(2) + '%' : null,
      notes: firstZero ? `${firstZero.applicants} applicants shut out below ${firstZero.ptInt} pts` : undefined,
      _tiers: b.tiers,  // evidence
    };
  }
  return out;
}

const resident = parseSimple(txt('resident'));
const nrRandom = parseSimple(txt('nr_random'));
const nrSpecialRandom = parseSimple(txt('nr_special_random'));
const nrRegular = parsePref(txt('nr_regular'));
const nrSpecial = parsePref(txt('nr_special'));

// Random-pool odds = quota / first-choice applicants, capped at 100%.
// Undersubscribed pools (quota >= applicants, or 0 applicants) = guaranteed draw.
const pct = (q, f) => {
  if (q <= 0) return '0%';
  if (f <= 0 || q >= f) return '~100%';
  return (q / f * 100).toFixed(2) + '%';
};

const TARGETS = ['10-1','60-1','60-2','64-2','84-1','79-1','80-1','116-1','117-1','118-1','119-1','119-2','157-1'];

// Validation tag included to prove the rule:
const CHECK = '141-1';

// Clean note wording for pref pools, including the 0-quota / all-shut-out case.
function prefNote(p, poolLabel) {
  if (!p) return undefined;
  if (p.quota === 0) return `No NR ${poolLabel} pool tags allocated in 2025`;
  if (p.minPoints === null) return `All NR ${poolLabel} applicants shut out in 2025`;
  return p.notes;
}

function build(key) {
  const r = resident[key], rand = nrRandom[key], srand = nrSpecialRandom[key];
  const reg = nrRegular[key], spec = nrSpecial[key];
  return {
    year: 2025,
    nr_regular: reg ? { quota: reg.quota, minPoints: reg.minPoints, oddsAtMin: reg.oddsAtMin, notes: prefNote(reg, 'regular') }
                    : { quota: 0, minPoints: null, oddsAtMin: null },
    nr_special: spec ? { quota: spec.quota, minPoints: spec.minPoints, oddsAtMin: spec.oddsAtMin, notes: prefNote(spec, 'special') }
                     : { quota: 0, minPoints: null, oddsAtMin: null },
    nr_random: rand ? { quota: rand.quota, firstChoiceApplicants: rand.firstChoiceApplicants, approxOdds: pct(rand.quota, rand.firstChoiceApplicants) }
                    : { quota: 0, firstChoiceApplicants: 0, approxOdds: '0%' },
    nr_special_random: srand ? { quota: srand.quota, firstChoiceApplicants: srand.firstChoiceApplicants, approxOdds: pct(srand.quota, srand.firstChoiceApplicants) }
                             : { quota: 0, firstChoiceApplicants: 0, approxOdds: '0%' },
    resident: r ? { quota: r.quota, firstChoiceApplicants: r.firstChoiceApplicants, approxOdds: pct(r.quota, r.firstChoiceApplicants) }
                : { quota: 0, firstChoiceApplicants: 0, approxOdds: '0%' },
  };
}

console.log('### VALIDATION — 141-1 (compare to existing hand-entered 2025) ###');
console.log(JSON.stringify(build(CHECK), null, 1));

console.log('\n### DERIVED — target tags ###');
const valid = {};
for (const k of TARGETS) {
  const present = resident[k] || nrRegular[k] || nrSpecial[k] || nrRandom[k] || nrSpecialRandom[k];
  if (!present) { console.log(`\n--- ${k} ---  ABSENT FROM ALL 2025 REPORTS (skipped)`); continue; }
  valid[k] = build(k);
  console.log(`\n--- ${k} ---`);
  console.log(JSON.stringify(valid[k]));
}
import { writeFileSync } from 'fs';
writeFileSync(`${DIR}/derived.json`, JSON.stringify(valid, null, 2));
console.log(`\nWrote ${Object.keys(valid).length} entries to derived.json`);

// ── WHITETAIL (Type 3) — multi-area groups reported under their LEAD area ──────
// dataKey (grouped) -> reportKey (lead area, type 3). Verified: each group's
// lead area is the only one with a Type-3 row in the reports.
const WHITETAIL = {
  '11-12-13-14-3': '11-3', '23-26-3': '23-3', '59-64-3': '59-3', '65-3': '65-3',
  '66-88-89-3': '66-3', '70-74-3': '70-3', '75-76-77-3': '75-3', '78-79-80-81-3': '78-3',
  '92-94-160-3': '92-3', '112-113-3': '112-3', '116-117-3': '116-3', '119-120-3': '119-3',
  '132-133-134-135-168-3': '132-3', '138-143-3': '138-3', '148-156-3': '148-3', '149-3': '149-3',
  '157-3': '157-3',
};
console.log('\n### WHITETAIL — derived (keyed by data key) ###');
const wt = {};
for (const [dataKey, reportKey] of Object.entries(WHITETAIL)) {
  const present = resident[reportKey] || nrRandom[reportKey] || nrRegular[reportKey] || nrSpecial[reportKey] || nrSpecialRandom[reportKey];
  if (!present) { console.log(`--- ${dataKey} (lead ${reportKey}) --- ABSENT (skipped)`); continue; }
  wt[dataKey] = build(reportKey);
  console.log(`--- ${dataKey} (lead ${reportKey}) ---  ${JSON.stringify(wt[dataKey])}`);
}
writeFileSync(`${DIR}/whitetail.json`, JSON.stringify(wt, null, 2));
console.log(`\nWrote ${Object.keys(wt).length} whitetail entries to whitetail.json`);
