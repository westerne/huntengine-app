// Official application links, deadlines, fees and prerequisites for a hunt,
// from the 17-state application data (lib/huntdata/apply, owner-signed-off).
// Only a deadline the agency has posted for the hunt's own season year is
// ever offered as "the deadline"; last year's and calculated dates are shown
// for reference, labeled.

import type { OfficialInfo } from '@/app/season/[id]/ApplicationPanel';
import type { Residency } from './schema';
import { applyFile, deadlineFor, feesFor, prerequisitesFor } from './apply';
import { speciesKeyOf } from '../species';

const EMPTY: OfficialInfo = { applyUrl: null, datesPageUrl: null, prerequisites: [], deadline: null, reference: null, fees: [], checkedOn: null };

export function officialInfoFor(state: string, species: string, seasonYear: number, residency: Residency | null = null): OfficialInfo {
  const f = applyFile(state);
  if (!f) return EMPTY;
  const key = speciesKeyOf(species, state);
  const d = deadlineFor(state, key, residency, seasonYear);
  return {
    applyUrl: f.applyUrl,
    datesPageUrl: f.howToUrl,
    prerequisites: prerequisitesFor(state, key, residency).map((p) => ({ text: p.text, source: p.source })),
    deadline: d && d.kind === 'published'
      ? { date: d.date, time: d.time, timezone: d.timezone, group: d.name, source: d.source }
      : null,
    reference: d && d.kind !== 'published'
      ? { kind: d.kind, date: d.date, time: d.time, timezone: d.timezone, group: d.name, year: d.year, source: d.source }
      : null,
    fees: feesFor(state, key, residency).map((x) => ({ label: x.label, item: x.item, amount: x.amount, year: x.year, residency: x.residency, source: x.source })),
    checkedOn: f.checkedOn,
  };
}
