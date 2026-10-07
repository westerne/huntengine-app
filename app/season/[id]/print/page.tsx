import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/membership';
import { accountsEnabled } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { mergedSections, PLAN_SECTIONS, type PlanInputs } from '@/lib/plans';
import { officialInfoFor } from '@/lib/huntdata/applicationInfo';
import { harvestReportingFor } from '@/lib/huntdata/harvestReporting';
import { STATE_INFO, toStateCode } from '@/lib/huntdata/registry';
import type { Task } from '@/lib/applications';
import PrintButton from './PrintButton';
import { huntTitle } from '@/lib/huntName';

export const dynamic = 'force-dynamic';

// Printable hunt packet: the current plan, gear checklist, dates and official
// links on paper. It is a reference sheet, NOT a navigation map — it says so
// at the top, and it never prints coordinates.


function Blank({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2 text-sm">
      <span className="whitespace-nowrap font-bold">{label}</span>
      <span className="flex-1 border-b border-zinc-400 h-5" />
    </div>
  );
}

export default async function PrintPacket({ params }: { params: Promise<{ id: string }> }) {
  if (!accountsEnabled()) redirect('/');
  const viewer = await getViewer();
  if (!viewer.userId) redirect('/login');
  if (!viewer.member) redirect('/join');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await supabaseServer();
  const { data: hunt } = await supabase.from('saved_hunts').select('*').eq('id', id).maybeSingle();
  if (!hunt) notFound();
  const [{ data: plan }, { data: gear }] = await Promise.all([
    supabase.from('hunt_plans').select('*').eq('hunt_id', id).eq('is_current', true).maybeSingle(),
    supabase.from('tasks').select('*').eq('hunt_id', id).eq('kind', 'prep').order('position'),
  ]);

  const code = toStateCode(hunt.state);
  const info = code ? STATE_INFO[code] : null;
  const official = officialInfoFor(hunt.state, hunt.species, hunt.season_year);
  const harvest = harvestReportingFor(hunt.state, hunt.species);
  const sections = plan ? mergedSections(plan.generated?.sections ?? {}, plan.edited ?? {}) : null;
  const inputs = (plan?.inputs ?? {}) as Partial<PlanInputs>;
  const dates = hunt.hunt_start ? `${hunt.hunt_start}${hunt.hunt_end ? ` to ${hunt.hunt_end}` : ''}` : 'Not set';

  return (
    <div className="min-h-screen bg-zinc-200 print:bg-white py-8 print:py-0">
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <Link href={`/season/${id}`} className="text-zinc-700 text-[11px] font-black uppercase tracking-widest hover:text-black">← Back to the hunt</Link>
        <PrintButton />
      </div>

      <article className="max-w-3xl mx-auto bg-white text-black p-8 print:p-0 shadow print:shadow-none space-y-6 text-[13px] leading-relaxed">
        <p className="border-2 border-black p-3 font-bold text-sm">
          NOT AN OFFLINE NAVIGATION MAP. This packet has no maps or coordinates. Carry a real map and a GPS or phone app with
          offline maps downloaded, check land status and closures yourself, and tell someone your route and return time.
        </p>

        <header className="border-b-2 border-black pb-3">
          <p className="text-xs font-bold uppercase tracking-widest">HuntQuarters hunt packet · {hunt.season_year} season</p>
          <h1 className="text-2xl font-black uppercase">{info?.name ?? hunt.state} {hunt.species} · {huntTitle(hunt.unit, hunt.hunt_code)}</h1>
          {hunt.label && <p>{hunt.label}</p>}
          <p className="mt-1"><b>Hunt dates:</b> {dates}{inputs.weapon ? ` · ${inputs.weapon}` : ''}{inputs.party_size ? ` · party of ${inputs.party_size}` : ''}</p>
          <p className="text-xs text-zinc-600">Printed {new Date().toLocaleDateString('en-US')}{plan ? ` · plan version ${plan.version}` : ''}</p>
        </header>

        <section className="break-inside-avoid">
          <h2 className="font-black uppercase text-sm border-b border-black mb-2">Emergency</h2>
          <p className="mb-3"><b>Call 911.</b> Cell coverage may be missing — know where you can get a signal, and consider a satellite messenger. Look these up before you leave:</p>
          <div className="space-y-3">
            <Blank label="Nearest hospital:" />
            <Blank label="County sheriff:" />
            <Blank label="Where we’ll park / trailhead:" />
            <Blank label="Expected back (date, time):" />
            <Blank label="Contact at home:" />
          </div>
        </section>

        <section className="break-inside-avoid">
          <h2 className="font-black uppercase text-sm border-b border-black mb-2">Official links</h2>
          <ul className="space-y-1 break-all">
            {info?.agency.url && <li><b>{info.agency.name}:</b> {info.agency.url}</li>}
            {official.datesPageUrl && <li><b>Seasons and regulations:</b> {official.datesPageUrl}</li>}
            {harvest.reportUrl && <li><b>Official harvest reporting:</b> {harvest.reportUrl}</li>}
          </ul>
          <p className="mt-2">
            <b>Harvest reporting:</b>{' '}
            {harvest.required === 'unknown'
              ? `We haven't verified ${hunt.state}'s rule for ${hunt.species.toLowerCase()}. Check the current regulations.`
              : harvest.rules.filter((r) => r.type !== 'survey').map((r) => `${r.applies}${r.deadline ? ` — ${r.deadline}` : ''}`).join(' ') || harvest.summary}
            {' '}The HuntQuarters report does not report your harvest to the state.
          </p>
          <p className="text-xs text-zinc-600 mt-1">Season dates, legal hours, units and rules: confirm in this year&apos;s official regulations, and carry your license and tag.</p>
        </section>

        {sections ? (
          <section>
            <h2 className="font-black uppercase text-sm border-b border-black mb-2">Your hunt plan</h2>
            <div className="space-y-4">
              {PLAN_SECTIONS.filter((s) => s.key !== 'emergency').map((s) => (
                <div key={s.key} className="break-inside-avoid">
                  <h3 className="font-bold uppercase text-xs tracking-wider">{s.title}</h3>
                  <p className="whitespace-pre-wrap">{sections[s.key].text}</p>
                </div>
              ))}
              {sections.emergency.text && (
                <div className="break-inside-avoid">
                  <h3 className="font-bold uppercase text-xs tracking-wider">Emergency notes from your plan</h3>
                  <p className="whitespace-pre-wrap">{sections.emergency.text}</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <p className="italic">No hunt plan yet — make one from the hunt&apos;s page and print again.</p>
        )}

        <section>
          <h2 className="font-black uppercase text-sm border-b border-black mb-2">Gear checklist</h2>
          {(gear ?? []).length === 0 ? (
            <p className="italic">No gear list yet.</p>
          ) : (
            <ul className="columns-2 gap-6">
              {(gear as Task[]).map((g) => (
                <li key={g.id} className="break-inside-avoid flex gap-2 items-start">
                  <span aria-hidden className="inline-block w-3.5 h-3.5 border border-black mt-1 shrink-0 text-[10px] leading-[12px] text-center">{g.done_at ? '✓' : ''}</span>
                  <span>{g.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="break-inside-avoid">
          <h2 className="font-black uppercase text-sm border-b border-black mb-2">Field notes</h2>
          <div className="space-y-5 pt-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="border-b border-zinc-400 h-5" />)}</div>
          <p className="text-xs text-zinc-600 mt-3">Write what you see. Add it to your hunt report when you&apos;re back.</p>
        </section>
      </article>
    </div>
  );
}
