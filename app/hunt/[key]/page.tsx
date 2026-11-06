import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { currentSeasonYear } from '@/lib/hunts';
import { usesPoints } from '@/lib/calendar';
import { parseCompareKey } from '@/lib/compare';
import { getStateModule, STATE_INFO, toStateCode } from '@/lib/huntdata/registry';
import { successText } from '@/lib/huntdata/generic';
import { ladderFor } from '@/lib/huntdata/ladder';
import { howItDraws } from '@/lib/huntdata/weightedDraw';
import { SPECIES_NAME, speciesKeyOf } from '@/lib/species';
import { titleCaseState } from '@/lib/scoutData';
import type { SpeciesKey } from '@/lib/huntdata/schema';
import HuntView from './HuntView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hunt | HuntQuarters' };

// One hunt on its own: /hunt/NV~ELK~4161-111. Leads with how the hunter's
// chance grows as they build points, from the agency's own figures.

export default async function HuntPage({ params }: { params: Promise<{ key: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');

  const k = parseCompareKey(decodeURIComponent((await params).key));
  const mod = k ? getStateModule(k.state) : null;
  const hunts = k && mod ? mod.hunts(k.speciesKey as SpeciesKey) : [];
  const hunt = k && (hunts.find((h) => h.huntCode === k.code) ?? hunts.find((h) => h.huntCode.toLowerCase() === k.code.toLowerCase()));
  if (!k || !mod || !hunt) notFound();

  const supabase = await supabaseServer();
  const [{ data: profile }, { data: points }] = await Promise.all([
    supabase.from('profiles').select('home_state').eq('user_id', viewer.userId).maybeSingle(),
    supabase.from('hunter_points').select('state, species, points'),
  ]);
  const home = profile?.home_state ? toStateCode(profile.home_state) : null;
  const residency = home === mod.code ? 'resident' : 'nonresident';
  const species = SPECIES_NAME[hunt.species] ?? hunt.species;
  const bal = (points ?? []).find((p) => toStateCode(p.state) === mod.code && speciesKeyOf(p.species, mod.code) === hunt.species);
  const stat = residency === 'resident' ? hunt.draw.resident : hunt.draw.nonresident;
  const info = STATE_INFO[mod.code];

  return (
    <div className="hq" style={{ minHeight: '100vh' }}>
      <HuntView
        hunt={{
          key: `${mod.code}~${hunt.species}~${hunt.huntCode}`,
          state: mod.code, stateName: titleCaseState(info.name), species, unit: hunt.unit, huntCode: hunt.huntCode,
          label: hunt.label ?? null, weapon: hunt.weapon ?? null, season: hunt.season ?? null,
          tags: stat?.tags ?? hunt.tags ?? null, applicants: stat?.applicants ?? hunt.applicants ?? null,
          hunterSuccess: hunt.harvest ? `${successText(hunt.harvest, hunt.tags)} (${hunt.harvest.year})` : null,
          drawYear: hunt.drawYear, openToYou: !hunt.openTo || hunt.openTo === residency,
          drawRules: info.drawSystemNote, howItDraws: howItDraws(hunt), agencyUrl: info.agency?.url ?? null, agencyName: info.agency?.name ?? null,
        }}
        residency={residency}
        ladder={ladderFor(hunt, residency)}
        usesPoints={usesPoints(mod, species)}
        startPoints={bal ? Number(bal.points) : null}
        seasonYear={currentSeasonYear()}
      />
    </div>
  );
}
