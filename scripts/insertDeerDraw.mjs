// Insert derived 2025 drawHistory into wyodeerdata.ts for the 12 verified tags.
// Reads scripts/derived.json, writes the data file in place. Idempotent-ish:
// only touches entries whose drawHistory is currently empty ("[]").
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = import.meta.dirname;
const DATA = join(DIR, '..', 'app', 'api', 'strategy', 'wyodeerdata.ts');
const jsonFile = process.argv[2] || 'derived.json';
const derived = JSON.parse(readFileSync(join(DIR, jsonFile), 'utf8'));

const q = (s) => JSON.stringify(s); // safe string quoting
const prefPool = (p) => {
  const parts = [`quota: ${p.quota}`, `minPoints: ${p.minPoints === null ? 'null' : p.minPoints}`,
                 `oddsAtMin: ${p.oddsAtMin === null ? 'null' : q(p.oddsAtMin)}`];
  if (p.notes) parts.push(`notes: ${q(p.notes)}`);
  return `{ ${parts.join(', ')} }`;
};
const randPool = (p) => `{ quota: ${p.quota}, firstChoiceApplicants: ${p.firstChoiceApplicants}, approxOdds: ${q(p.approxOdds)} }`;

function fmt(d) {
  return `drawHistory: [
      { year: ${d.year},
        nr_regular:        ${prefPool(d.nr_regular)},
        nr_special:        ${prefPool(d.nr_special)},
        nr_random:         ${randPool(d.nr_random)},
        nr_special_random: ${randPool(d.nr_special_random)},
        resident:          ${randPool(d.resident)} },
    ]`;
}

let src = readFileSync(DATA, 'utf8');
let done = 0, skipped = [];
for (const [key, d] of Object.entries(derived)) {
  const startTok = `  "${key}": {`;
  const start = src.indexOf(startTok);
  if (start === -1) { skipped.push(`${key} (entry not found)`); continue; }
  const dhTok = 'drawHistory: []';
  const dhIdx = src.indexOf(dhTok, start);
  // Guard: the drawHistory must belong to THIS entry (before the next entry key)
  const nextEntry = src.indexOf('\n  "', start + startTok.length);
  if (dhIdx === -1 || (nextEntry !== -1 && dhIdx > nextEntry)) {
    skipped.push(`${key} (no empty drawHistory in entry)`);
    continue;
  }
  src = src.slice(0, dhIdx) + fmt(d) + src.slice(dhIdx + dhTok.length);
  done++;
}

writeFileSync(DATA, src);
console.log(`Inserted drawHistory into ${done} entries.`);
if (skipped.length) console.log('Skipped:', skipped.join('; '));
