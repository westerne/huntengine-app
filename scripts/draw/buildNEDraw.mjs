// Build lib/huntdata/draw/ne.json from Nebraska Game & Parks' annual
// "Nebraska Draw Results" PDF (elk, deer, antelope big-game draws).
//
// MANUAL DOWNLOAD STEP (required): outdoornebraska.gov sits behind a bot check
// that blocks scripted downloads, so this script never fetches anything. Each
// year, open
//   https://outdoornebraska.gov/permits/hunting-permits/big-game-permits/draw-results/
// in a normal browser, download the "<YEAR> Nebraska Draw Results" PDF and save
// it as
//   data/ne/<YEAR>-Nebraska-Draw-Results.pdf
// (any file in data/ne/ whose name starts with the 4-digit year and contains
// "Draw-Results" is picked up; the newest year wins). Then run:
//   node scripts/draw/buildNEDraw.mjs            # newest year
//   node scripts/draw/buildNEDraw.mjs 2025       # a specific year
//
// Requires `pdftotext` (xpdf 4.x, which has -table) on PATH. The -table mode is
// used because -layout glues adjacent small numbers together ("869611211211")
// and -raw drops empty cells. Tables are found by title text, not table number,
// because NGPC renumbers tables from year to year. Every point-pool row is
// checked against its printed Total column; the script throws instead of
// guessing if a row does not reconcile.
//
// No npm dependencies.

import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = join(ROOT, 'data', 'ne');
const OUT = join(ROOT, 'lib', 'huntdata', 'draw', 'ne.json');
const SOURCE_URL = 'https://outdoornebraska.gov/permits/hunting-permits/big-game-permits/draw-results/';

// ---------- locate + extract ----------
function pickPdf(wantYear) {
  const files = readdirSync(DATA_DIR)
    .map((f) => ({ f, m: /^(\d{4})-.*Draw-Results.*\.pdf$/i.exec(f) }))
    .filter((x) => x.m)
    .map((x) => ({ file: x.f, year: Number(x.m[1]) }))
    .sort((a, b) => b.year - a.year);
  if (!files.length) throw new Error(`No *Draw-Results*.pdf in ${DATA_DIR} — see the manual download step at the top of this script.`);
  const hit = wantYear ? files.find((x) => x.year === wantYear) : files[0];
  if (!hit) throw new Error(`No ${wantYear} draw-results PDF in ${DATA_DIR}`);
  return hit;
}

function pdfLines(path) {
  const txt = execFileSync('pdftotext', ['-table', '-enc', 'UTF-8', path, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return txt
    .split(/\r?\n/)
    .map((l) => l.replace(/[–—�]/g, '-').replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '');
}

// Lines of the table whose title matches `titleRe`, up to the next "Table N." title
// or a known section heading.
function tableLines(lines, titleRe) {
  const start = lines.findIndex((l) => /^\s*Table\s+\d+\./.test(l) && titleRe.test(l.replace(/\s+/g, ' ')));
  if (start < 0) throw new Error(`Table not found: ${titleRe}`);
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*Table\s+\d+\./.test(l)) break;
    if (/^(General|Limited|Landowner|Preference\/Bonus)\b/.test(l.trim()) && !/^\s*Unit/.test(l)) {
      if (!/\d/.test(l)) break; // section heading
    }
    out.push(l);
  }
  return out;
}

const tokenSpans = (s) => [...s.matchAll(/\S+/g)].map((m) => ({ t: m[0], a: m.index, b: m.index + m[0].length }));

// Parse a grid table: header line starts with `headerRe`; rows matched by rowRe
// (group 1 = label, rest of line = cells). Returns { cols, rows:[{label, cells}] }.
// When a row has fewer cells than columns (blank cells), cells are assigned to the
// nearest header column by character position.
function parseGrid(tl, headerRe, rowRe) {
  const hi = tl.findIndex((l) => headerRe.test(l));
  if (hi < 0) throw new Error('Header not found: ' + headerRe);
  const hdr = tokenSpans(tl[hi]).slice(1); // drop "Unit"/"Drawing Data"
  const cols = hdr.map((h) => h.t);
  const rows = [];
  for (const l of tl.slice(hi + 1)) {
    const m = rowRe.exec(l);
    if (!m) continue;
    const label = m[1].replace(/\s+/g, ' ').trim();
    const cellStart = l.indexOf(m[2], m.index + m[0].length - m[2].length);
    let spans = tokenSpans(m[2]).map((s) => ({ ...s, a: s.a + cellStart, b: s.b + cellStart }));
    let cells;
    if (spans.length === cols.length) cells = spans.map((s) => s.t);
    else if (spans.length < cols.length) {
      cells = new Array(cols.length).fill(null);
      for (const s of spans) {
        const c = (s.a + s.b) / 2;
        let best = -1, bd = Infinity;
        hdr.forEach((h, i) => { const d = Math.abs((h.a + h.b) / 2 - c); if (d < bd && cells[i] === null) { bd = d; best = i; } });
        cells[best] = s.t;
      }
    } else throw new Error(`Too many cells in row "${l}"`);
    rows.push({ label, cells });
  }
  return { cols, rows };
}

const num = (s) => {
  if (s == null || s === '-' || s === '') return null;
  const v = Number(String(s).replace(/,/g, '').replace(/%$/, ''));
  if (!Number.isFinite(v)) throw new Error(`Not a number: "${s}"`);
  return v;
};
const r1 = (x) => Math.round(x * 10) / 10;
const capped = [];
const mismatches = [];
function pct(drawn, apps, ctx) {
  if (apps == null || apps === 0 || drawn == null) return null;
  const p = r1((100 * drawn) / apps);
  if (p > 100) { capped.push(`${ctx} (${p}%)`); return 100; }
  return p;
}

// Point grid (applicants or successful): checks each row against its Total column.
function pointGrid(tl, headerRe, rowRe, tag) {
  const totalCol = /^Total\*?$/;
  const g = parseGrid(tl, headerRe, rowRe);
  const ti = g.cols.findIndex((c) => totalCol.test(c));
  const pcols = g.cols.slice(0, ti < 0 ? g.cols.length : ti).map(Number);
  if (pcols.some((p) => !Number.isFinite(p))) throw new Error('Bad point header: ' + g.cols.join(' '));
  const out = new Map();
  for (const r of g.rows) {
    const vals = pcols.map((_, i) => num(r.cells[i]) ?? 0);
    const total = ti < 0 ? null : num(r.cells[ti]);
    const sum = vals.reduce((a, b) => a + b, 0);
    if (total != null && sum !== total) {
      // NGPC's own tables occasionally don't add up; tolerate a 1-off and record it,
      // anything bigger means the columns were mis-parsed.
      if (Math.abs(sum - total) > 1) throw new Error(`Row "${r.label}" sums to ${sum}, printed Total ${total}`);
      mismatches.push(`${r.label} (${tag}): point pools sum to ${sum}, printed Total ${total}`);
    }
    out.set(r.label, { points: pcols, vals, total: total ?? sum });
  }
  return out;
}

const lines4 = (pl, sl) =>
  pl.points
    .map((p, i) => ({ points: p, applicants: pl.vals[i], drawn: sl ? sl.vals[i] : null }))
    .filter((x) => x.applicants > 0 || (x.drawn ?? 0) > 0);

const minDrawnPoints = (pls) => { const hit = pls.find((x) => x.drawn > 0); return hit ? hit.points : null; };

// ---------- build ----------
const wantYear = process.argv[2] ? Number(process.argv[2]) : null;
const { file, year } = pickPdf(wantYear);
const L = pdfLines(join(DATA_DIR, file));

const ELK = [], DEER = [], ANTELOPE = [];

// --- General bull elk (bonus points, residents only) ---
{
  const bullRow = /^(Unit \d+ Bull)\s+(.*)$/;
  const apps = pointGrid(tableLines(L, /General Bull Elk applica(nts|tions) by bonus point pool/i), /^Unit\s+0\s+1\b/, bullRow, "general bull applicants");
  const succ = pointGrid(tableLines(L, /General Bull Elk successful applica(nts|tions) from each point pool/i), /^Unit\s+0\s+1\b/, bullRow, "general bull successful");
  for (const [label, a] of apps) {
    const s = succ.get(label);
    if (!s) throw new Error('No successful row for ' + label);
    const unit = label.replace(/ Bull$/, '');
    const n = unit.replace('Unit ', '');
    ELK.push({
      huntCode: `ELK-UNIT${n}-BULL`,
      unit,
      label: `Bull elk — ${unit} (general, resident)`,
      tags: null,
      draw: { resident: { tags: null, applicants: a.total, successPct: pct(s.total, a.total, `${unit} general bull`) }, nonresident: null },
      pointLines: { resident: lines4(a, s) },
    });
  }
}

// --- General antlerless elk ---
{
  const tl = tableLines(L, /Odds of drawing \d{4} General Antlerless Elk permits/i);
  for (const l of tl) {
    const m = /^(Unit (\d+) (?:(Early|Late) )?Antlerless)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(\d+)%/.exec(l.trim());
    if (!m) continue;
    const [, , n, period, appl, applicants, succ, issued, printed] = m;
    const unit = `Unit ${n}`;
    const p = pct(num(succ), num(appl), `${unit} ${period ?? ''} general antlerless`.replace(/\s+/g, ' '));
    if (Math.abs((100 * num(succ)) / num(appl) - num(printed)) > 1)
      throw new Error(`Antlerless ${unit} ${period}: computed ${p} vs printed ${printed}%`);
    ELK.push({
      huntCode: `ELK-UNIT${n}-${period ? period.toUpperCase() + '-' : ''}ANTLERLESS`,
      unit,
      label: `Antlerless elk${period ? ' (' + period.toLowerCase() + ')' : ''} — ${unit} (general, resident)`,
      tags: num(issued),
      draw: { resident: { tags: num(issued), applicants: num(appl), successPct: p }, nonresident: null },
    });
    void applicants;
  }
}

// --- Limited landowner bull elk (preference points; resident + NR landowners combined) ---
{
  const loRow = /^(Unit\s+\d+\s+-\s+Bull)\s+(.*)$/;
  const apps = pointGrid(tableLines(L, /applicants by unit and preference point pool for \d{4} Limited Landowner Bull Elk/i), /^Unit\s+0\s+0\.9\b/, loRow, "landowner bull applicants");
  const succ = pointGrid(tableLines(L, /Number successful by unit and preference point pool for \d{4} Limited Landowner Bull Elk/i), /^Unit\s+0\s+0\.9\b/, loRow, "landowner bull successful");
  for (const [label, a] of apps) {
    const s = succ.get(label);
    if (!s) throw new Error('No LO successful row for ' + label);
    const n = /Unit (\d+)/.exec(label)[1];
    const unit = `Unit ${n}`;
    const pl = lines4(a, s);
    ELK.push({
      huntCode: `ELK-UNIT${n}-LANDOWNER-BULL`,
      unit,
      label: `Limited landowner bull elk — ${unit} (resident + nonresident landowners combined)`,
      tags: null,
      draw: { resident: { tags: null, applicants: a.total, successPct: pct(s.total, a.total, `${unit} landowner bull`), minPoints: minDrawnPoints(pl) }, nonresident: null },
      pointLines: { resident: pl },
    });
  }
}

// --- Limited landowner antlerless elk ---
{
  const tl = tableLines(L, /Limited Landowner Antlerless Elk permits/i);
  for (const l of tl) {
    const m = /^Unit\s+(\d+)\s+-\s+Antlerless\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(\d+%|-)/.exec(l.trim());
    if (!m) continue;
    const [, n, appl, quota, issued, printed] = m;
    const unit = `Unit ${n}`;
    // Use NGPC's printed Draw Success; flag rows where it disagrees with issued ÷ applications.
    const calc = pct(num(issued), num(appl), `${unit} landowner antlerless`);
    const p = printed === '-' ? null : num(printed);
    if (p != null && Math.abs(calc - p) > 1) mismatches.push(`${unit} landowner antlerless: printed ${p}% vs issued÷applications ${calc}%`);
    ELK.push({
      huntCode: `ELK-UNIT${n}-LANDOWNER-ANTLERLESS`,
      unit,
      label: `Limited landowner antlerless elk — ${unit} (resident + nonresident landowners combined)`,
      tags: num(quota),
      draw: { resident: { tags: num(quota), applicants: num(appl), successPct: p }, nonresident: null },
    });
  }
}

// --- Deer draw units (preference points) ---
{
  const deerRow = /^(.*?\bN?R)\s+([-\d].*)$/;
  const norm = (s) => s.replace(/\s*-\s*(N?R)$/, ' - $1').replace(/\s+/g, ' ').trim();
  const summary = new Map();
  for (const l of tableLines(L, /Number of applicants\s*\(group members included\), permits available/i)) {
    const m = /^(.*?\bN?R)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(\d+)%/.exec(l.trim());
    if (m) summary.set(norm(m[1]), { applicants: num(m[2]), available: num(m[3]), issued: num(m[4]), printed: num(m[5]) });
  }
  const remap = (mp) => new Map([...mp].map(([k, v]) => [norm(k), v]));
  const apps = remap(pointGrid(tableLines(L, /First Choice deer applications by preference point pool/i), /^Unit\s+0\s+1\b/, deerRow, "deer applications"));
  const succ = remap(pointGrid(tableLines(L, /Successful applications by preference point pool/i), /^Unit\s+0\s+1\b/, deerRow, "deer successful"));
  const byUnit = new Map();
  for (const [label, sm] of summary) {
    const [, area, res] = /^(.*) - (N?R)$/.exec(label);
    const isState = /^Statewide/.test(area);
    const unit = isState ? 'Statewide' : area.replace(/ MDCA$/, '');
    const key = area;
    if (!byUnit.has(key)) {
      byUnit.set(key, {
        huntCode: `DEER-${unit.toUpperCase().replace(/\s+/g, '')}-${isState ? area.split(' ')[1].toUpperCase() : /MDCA$/.test(area) ? 'MDCA' : 'DRAW'}`,
        unit,
        label: `Deer — ${area}`,
        ...(isState ? { weapon: /Archery/.test(area) ? 'archery' : 'muzzleloader' } : {}),
        tags: 0,
        draw: { resident: null, nonresident: null },
        pointLines: {},
      });
    }
    const row = byUnit.get(key);
    const pool = res === 'R' ? 'resident' : 'nonresident';
    const p = pct(sm.issued, sm.applicants, `${label} deer`);
    if (Math.abs(Math.min(p, 100) - sm.printed) > 1) throw new Error(`Deer ${label}: computed ${p} vs printed ${sm.printed}%`);
    const a = apps.get(label), s = succ.get(label);
    if (!a || !s) throw new Error('Missing deer point rows for ' + label);
    const pl = lines4(a, s);
    row.draw[pool] = { tags: sm.available, applicants: sm.applicants, successPct: p, minPoints: minDrawnPoints(pl) };
    row.pointLines[pool] = pl;
    row.tags += sm.available;
  }
  for (const r of byUnit.values()) {
    const pools = Object.keys(r.pointLines);
    r.label += pools.length === 2 ? ' (resident & nonresident)' : pools[0] === 'resident' ? ' (resident)' : ' (nonresident)';
    DEER.push(r);
  }
}

// --- Antelope (preference points) ---
const antelopeNoPL = [];
{
  const antRow = /^(Firearm-.+?|\S.*? Muzzleloader|NR-Statewide Archery Antelope)\s+([-\d].*)$/;
  const apps = pointGrid(tableLines(L, /First Choice applications for Firearm Antelope permits/i), /^Unit\s+0\s+1\b/, antRow, "antelope applications");
  const g = parseGrid(tableLines(L, /Draw success of First Choice applicants by unit and preference point pool/i), /^Unit\s+0\b/, antRow);
  const qi = g.cols.indexOf('Quota');
  for (const r of g.rows) {
    const a = apps.get(r.label);
    if (!a) throw new Error('No antelope applicant row for ' + r.label);
    const pcts = a.points.map((pt) => num(r.cells[g.cols.indexOf(String(pt))]));
    const quota = num(r.cells[qi]);
    let unit, weapon, slugUnit, kind, res = 'resident';
    if (r.label.startsWith('Firearm-')) { unit = r.label.slice(8); weapon = 'rifle'; kind = 'FIREARM'; slugUnit = unit; }
    else if (/Muzzleloader$/.test(r.label)) { unit = r.label; weapon = 'muzzleloader'; kind = 'MUZZLELOADER'; slugUnit = r.label.replace(/ Muzzleloader$/, ''); }
    else { unit = 'Statewide'; weapon = 'archery'; kind = 'ARCHERY'; slugUnit = 'Statewide'; res = 'nonresident'; }
    // Successful counts per point pool are not printed — only integer percents.
    // Recover the count only when exactly one integer fits the printed percent.
    let pl = [], ok = true;
    a.points.forEach((pt, i) => {
      const n = a.vals[i];
      if (!n) return;
      const p = pcts[i];
      if (p == null) { ok = false; return; }
      const ks = [];
      for (let k = 0; k <= n * 3; k++) if (Math.abs((100 * k) / n - p) <= 0.5) ks.push(k);
      if (ks.length !== 1) { ok = false; return; }
      pl.push({ points: pt, applicants: n, drawn: ks[0] });
    });
    const firstPct = a.points.find((pt, i) => a.vals[i] > 0 && (pcts[i] ?? 0) > 0);
    const stat = { tags: quota, applicants: a.total, successPct: null, minPoints: firstPct ?? null };
    if (!ok) antelopeNoPL.push(r.label);
    ANTELOPE.push({
      huntCode: `ANTELOPE-${slugUnit.toUpperCase().replace(/\s+/g, '')}-${kind}`,
      unit,
      label: `${kind[0] + kind.slice(1).toLowerCase()} antelope — ${r.label.replace(/^Firearm-/, '').replace(/^NR-/, '')}${res === 'nonresident' ? ' (nonresident)' : ' (resident)'}`,
      weapon,
      tags: quota,
      draw: { resident: res === 'resident' ? stat : null, nonresident: res === 'nonresident' ? stat : null },
      ...(ok ? { pointLines: { [res]: pl } } : {}),
    });
  }
}

const hasSheep = L.some((l) => /bighorn|mountain sheep/i.test(l));

const notes = [
  `NGPC ${year} big-game draw results, read from a locally saved copy of the official "${year} Nebraska Draw Results" PDF (${file}); outdoornebraska.gov blocks scripted downloads.`,
  'Point systems as printed: general bull elk = BONUS points ("bonus point pool"; residents only; bull drawing data are First Choice options only); limited landowner bull elk = PREFERENCE points (resident landowners earn 1 point, nonresident landowners 0.9 per unsuccessful drawing); deer = PREFERENCE points; antelope = PREFERENCE points. Antlerless elk tables print no point breakdown.',
  'ELK: units are NGPC\'s "Unit N" numbering, identical to the elk map layer UnitName (no Unit 13 or Unit 15 permits appear in the PDF). General bull: applicants = first-choice applications (a group application counts once) from the bonus-point table, successPct = successful first-choice applications ÷ applications; per-unit bull quotas are NOT printed (tags null; 141 bull permits statewide). General antlerless: applicants = applications (first-choice antlerless + unsuccessful bull applicants with antlerless 2nd choice, per NGPC), tags = permits issued, successPct = successful applications ÷ applications. Landowner bull/antlerless: NGPC does not split by residency — resident and nonresident landowners are COMBINED in draw.resident / pointLines.resident (fractional point levels 0.9, 1.8, 2.7, 3.6, 4.5 are nonresident landowners). Landowner antlerless tags = quota; successPct = NGPC printed Draw Success (issued ÷ applications).',
  'DEER (draw units only): unit = the deer map-layer name (PDF "Frenchman MDCA" → unit "Frenchman"; "MDCA" = mule deer conservation area, kept in label/huntCode — the permit may cover only part of the unit polygon). Statewide Archery / Statewide Muzzleloader (nonresident) use unit "Statewide" (no map polygon). applicants = applicants incl. group members, tags = permits available, successPct = permits issued ÷ applicants. pointLines: first-choice applications vs successful applications by preference point (group applications count once; NGPC notes successful counts include second-choice draws, so drawn can exceed applicants at a level). minPoints = lowest point level with a successful application.',
  'ANTELOPE: unit = antelope map-layer UnitName ("Firearm-Banner North" → "Banner North"; "North Sioux Muzzleloader" and "Prairie Muzzleloader" are their own map polygons); NR Statewide Archery uses unit "Statewide". tags = quota; applicants = first-choice applications. NGPC prints only an integer draw-success percent per point pool (incl. second-choice draws, so >100% occurs), no per-unit overall success — successPct is null. pointLines.drawn was recovered from the printed percent only where exactly one whole number of draws matches it; rows where that was ambiguous have no pointLines' + (antelopeNoPL.length ? ` (${antelopeNoPL.join('; ')})` : '') + '. minPoints = lowest point level with a non-zero printed success. Firearm permits mapped to weapon "rifle". Landowner antelope (134 applications, all successful) has no unit breakdown and is omitted.',
  capped.length ? `successPct capped at 100 where the NGPC successful/issued count exceeds applicants (second-choice draws, or a table inconsistency): ${capped.join('; ')}.` : '',
  mismatches.length ? `PDF inconsistencies kept as printed (applicants/successful use the printed Total; pointLines use the printed pool cells): ${mismatches.join('; ')}.` : '',
  hasSheep ? '' : 'BIGHORN SHEEP: not in this PDF.',
  'No season dates are published with the draw results.',
].filter(Boolean).join(' ');

const outFile = {
  state: 'NE',
  year,
  source: { name: `Nebraska Game and Parks Commission — ${year} Nebraska Draw Results (PDF; read from a locally saved copy of the ${year} results PDF)`, url: SOURCE_URL },
  notes,
  species: { ELK, DEER, ANTELOPE },
};
writeFileSync(OUT, JSON.stringify(outFile, null, 1) + '\n');
console.log(`Wrote ${OUT} from ${file}: ELK ${ELK.length}, DEER ${DEER.length}, ANTELOPE ${ANTELOPE.length}; capped ${capped.length}; antelope rows without pointLines ${antelopeNoPL.length}`);
