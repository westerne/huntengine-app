import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { HUNT_DATA } from './data';
import { WYOMING_DEER_UNITS, buildDrawTrendBlock } from './wyodeerdata';
import { WYOMING_ELK_UNITS } from './wyoelkdata';
import {
  buildWyomingDeerScoutDataset,
  resolveWyoDeerUnit,
} from './wyodeerScoutAdapter';
import { getWildernessInfo } from './wyodeerWildernessClassification';
import { getElkAreaInfo } from './wyoElkAreaClassification';
import { buildScoutPrompt, ScoutPromptParams } from './promptBuilder';
import { WYOMING_ANTELOPE_UNITS } from './wyoantelopedata';
import { buildWyomingAntelopeScoutDataset } from './wyoantelopeScoutAdapter';
import { hasValidBetaAccess } from '@/lib/betaAccess';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getAccessSummary } from '@/lib/access';
import { getPublicLandPct, getUnitCentroid } from '@/lib/landstats';
import { IDAHO_GMU_UNITS } from './idahoUnits';
import { idahoHuntsForUnit, IDAHO_DRAW_YEAR } from './idahoDraw';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const speciesKeyMap: Record<string, string> = {
  'mule deer': 'DEER', 'muley': 'DEER', 'muleys': 'DEER', 'deer': 'DEER', 'whitetail': 'DEER',
  'elk': 'ELK', 'antelope': 'ANTELOPE', 'pronghorn': 'ANTELOPE',
  'moose': 'MOOSE', 'bighorn sheep': 'BIGHORNSHEEP', 'bighorn': 'BIGHORNSHEEP',
  'sheep': 'BIGHORNSHEEP', 'mountain goat': 'MTNGOAT', 'goat': 'MTNGOAT',
};

const stateAliases: Record<string, string> = {
  'WY': 'WYOMING', 'ID': 'IDAHO', 'MT': 'MONTANA', 'CO': 'COLORADO',
  'UT': 'UTAH', 'NV': 'NEVADA', 'AZ': 'ARIZONA', 'NM': 'NEW MEXICO',
  'OR': 'OREGON', 'WA': 'WASHINGTON',
};

const utahUnitAliases: Record<string, string> = {
  'henry mountains': 'Henry Mountains', 'henry mtns': 'Henry Mountains', 'henrys': 'Henry Mountains', 'henry': 'Henry Mountains', 'henry mtn': 'Henry Mountains',
  'paunsaugunt': 'Paunsaugunt', 'pauns': 'Paunsaugunt', 'paunsaugunt plateau': 'Paunsaugunt', 'bryce': 'Paunsaugunt',
  'book cliffs': 'Book Cliffs', 'book cliffs deer': 'Book Cliffs', 'book': 'Book Cliffs',
  'fillmore': 'Fillmore Oak Creek', 'oak creek': 'Fillmore Oak Creek', 'fillmore oak creek': 'Fillmore Oak Creek', 'fillmore deer': 'Fillmore Oak Creek',
  'san juan': 'San Juan', 'san juan deer': 'San Juan', 'southeast utah deer': 'San Juan',
  'la sal': 'La Sal Dolores Triangle', 'lasal': 'La Sal Dolores Triangle', 'la sal dolores': 'La Sal Dolores Triangle', 'dolores triangle': 'La Sal Dolores Triangle', 'la sal deer': 'La Sal Dolores Triangle', 'moab deer': 'La Sal Dolores Triangle',
  'diamond mountain': 'Diamond Mountain', 'diamond': 'Diamond Mountain', 'diamond mtn': 'Diamond Mountain', 'south slope': 'Diamond Mountain',
  'vernon': 'Vernon', 'west desert deer': 'Vernon', 'vernon deer': 'Vernon',
  'thousand lake': 'Thousand Lake', 'thousand lake mtn': 'Thousand Lake', 'thousand lake mountain': 'Thousand Lake',
  'boulder kaiparowits': 'Boulder Kaiparowits', 'boulder deer': 'Boulder Kaiparowits', 'kaiparowits deer': 'Boulder Kaiparowits', 'grand staircase deer': 'Boulder Kaiparowits',
  'monroe': 'Monroe', 'monroe deer': 'Monroe', 'monroe mountain deer': 'Monroe', 'monroe mountain': 'Monroe',
  'lasal general': 'LaSal General', 'la sal general': 'LaSal General', 'lasal gs': 'LaSal General',
  'san juan elk': 'San Juan', 'southeast utah elk': 'San Juan',
  'fillmore pahvant': 'Fillmore Pahvant', 'pahvant': 'Fillmore Pahvant', 'fillmore elk': 'Fillmore Pahvant', 'pahvant elk': 'Fillmore Pahvant',
  'monroe elk': 'Monroe Elk', 'monroe mountain elk': 'Monroe Elk', 'fishlake elk': 'Monroe Elk',
  'boulder elk': 'Boulder Elk', 'boulder mountain elk': 'Boulder Elk',
  'beaver elk': 'Beaver Elk', 'beaver': 'Beaver Elk', 'beaver unit elk': 'Beaver Elk',
  'southwest desert elk': 'Southwest Desert Elk', 'sw desert elk': 'Southwest Desert Elk', 'southwest desert': 'Southwest Desert Elk', 'sw desert': 'Southwest Desert Elk',
  'panguitch lake elk': 'Panguitch Lake Elk', 'panguitch elk': 'Panguitch Lake Elk', 'panguitch lake': 'Panguitch Lake Elk',
  'manti elk': 'Manti Elk', 'manti': 'Manti Elk', 'manti mountains elk': 'Manti Elk', 'manti la sal elk': 'Manti Elk',
  'mt dutton elk': 'Mt Dutton Elk', 'mount dutton elk': 'Mt Dutton Elk', 'mt dutton': 'Mt Dutton Elk', 'dutton elk': 'Mt Dutton Elk',
  'wasatch elk': 'Wasatch Elk', 'wasatch mountains elk': 'Wasatch Elk', 'wasatch': 'Wasatch Elk',
  'book cliffs elk': 'Book Cliffs Elk',
  'west desert': 'West Desert', 'west desert antelope': 'West Desert', 'utah west desert': 'West Desert',
  'plateau': 'Plateau', 'plateau antelope': 'Plateau', 'fishlake antelope': 'Plateau',
  'panguitch antelope': 'Panguitch Antelope', 'panguitch': 'Panguitch Antelope',
  'north slope uintas': 'North Slope Uintas', 'north slope': 'North Slope Uintas', 'uintas moose': 'North Slope Uintas', 'uinta moose': 'North Slope Uintas', 'north uintas': 'North Slope Uintas',
  'cache moose': 'Cache Moose', 'cache': 'Cache Moose', 'cache valley moose': 'Cache Moose', 'logan moose': 'Cache Moose',
  'uintas east moose': 'Uintas East Moose', 'east uintas moose': 'Uintas East Moose', 'uintas east': 'Uintas East Moose',
  'kaiparowits east': 'Kaiparowits East', 'kaiparowits east sheep': 'Kaiparowits East',
  'kaiparowits west': 'Kaiparowits West', 'kaiparowits west sheep': 'Kaiparowits West',
  'kaiparowits escalante': 'Kaiparowits Escalante', 'escalante sheep': 'Kaiparowits Escalante', 'escalante bighorn': 'Kaiparowits Escalante',
  'san rafael dirty devil': 'San Rafael Dirty Devil', 'san rafael': 'San Rafael Dirty Devil', 'dirty devil': 'San Rafael Dirty Devil', 'san rafael sheep': 'San Rafael Dirty Devil',
  'san rafael south': 'San Rafael South', 'san rafael south sheep': 'San Rafael South',
  'box elder': 'Box Elder Newfoundland RMBS', 'box elder sheep': 'Box Elder Newfoundland RMBS', 'newfoundland': 'Box Elder Newfoundland RMBS', 'box elder newfoundland': 'Box Elder Newfoundland RMBS',
  'fillmore oak creek rmbs': 'Fillmore Oak Creek RMBS', 'fillmore sheep': 'Fillmore Oak Creek RMBS', 'pahvant sheep': 'Fillmore Oak Creek RMBS', 'oak creek sheep': 'Fillmore Oak Creek RMBS',
};

export async function POST(req: Request) {
  try {
    // ─── 0. ABUSE GUARDS — rate limit, then beta gate ────────────────────────
    // These run before any OpenAI call so unauthenticated / abusive traffic
    // never costs a token.
    const rl = checkRateLimit(getClientIp(req));
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }
    if (!hasValidBetaAccess(req)) {
      return NextResponse.json(
        { error: 'Invalid or missing beta access code.' },
        { status: 401 }
      );
    }

    const { mode, formData, context = '' } = await req.json();

    console.log("MODE RECEIVED:", mode);
    console.log("STATE:", formData.states, formData.state);
    console.log("FULL FORMDATA:", JSON.stringify(formData, null, 2));

    // ─── 1. SPECIES & STATE RESOLUTION ───────────────────────────────────────
    const speciesRaw = (formData.species || '').toLowerCase();
    const speciesKey = speciesKeyMap[speciesRaw]
      || Object.entries(speciesKeyMap).find(([k]) => speciesRaw.includes(k))?.[1]
      || speciesRaw.toUpperCase().replace(/\s+/g, '');
    // The species the hunter is after, bound early so every block (draw summary,
    // guardrails) can reference it without re-deriving.
    const speciesLabel = (formData.species && String(formData.species).trim()) || speciesKey;

    const stateRaw = (formData.state || formData.states?.[0] || '').toUpperCase().trim();
    const stateName = stateAliases[stateRaw] || stateRaw;
    const lookupKey = `${stateName}_${speciesKey}`;

    // ─── 2. FLAGS ─────────────────────────────────────────────────────────────
    const isWyoming = stateName === 'WYOMING';
    const isIdaho = stateName === 'IDAHO';
    const isDeer = speciesKey === 'DEER';
    const isElk = speciesKey === 'ELK';
    const isAntelope = speciesKey === 'ANTELOPE';
    const residencyRaw = (formData.residency || '').toLowerCase().trim();
    const isResident = (residencyRaw === 'resident' || residencyRaw === 'yes' || residencyRaw === 'true')
      && !residencyRaw.includes('non-resident')
      && !residencyRaw.includes('non resident');

    // ─── 3. UNIT RESOLUTION ──────────────────────────────────────────────────
    const unitRaw = (formData.unit || '').toString().trim();
    const unitResolved = stateName === 'UTAH'
      ? (utahUnitAliases[unitRaw.toLowerCase()] || unitRaw)
      : unitRaw;

    // ─── 4. DATA LOOKUP ───────────────────────────────────────────────────────
    // For Wyoming deer, use the V2 resolver which handles:
    //   - bare numbers ("141" → "141-1")
    //   - UNIT_IN_REGION entries (draw data dereferenced through parentRegion)
    //   - exact keys ("G", "128-GEN", "141-1")
    const wyoResolved = isWyoming && isDeer
      ? resolveWyoDeerUnit(unitResolved)
      : { key: null, unit: null, drawSource: null };

    const v2Species = isWyoming && (isAntelope || isElk);
    const stateDataset: Record<string, any> = {
      ...(HUNT_DATA[lookupKey + '_ALL'] || {}),
      // For WY antelope/elk the V2 datasets below are authoritative and complete,
      // so skip the legacy 3-4 unit HUNT_DATA stubs — those bare keys (e.g. "7",
      // "57") lack draw history and would otherwise shadow the V2 "<area>-<type>"
      // products during bare-number resolution.
      ...(v2Species ? {} : (HUNT_DATA[lookupKey] || {})),
      // Wyoming antelope/elk V2: merge the full roster (with real draw history)
      // so BRIEF can resolve units from the same data SCOUT uses.
      ...(isWyoming && isAntelope ? WYOMING_ANTELOPE_UNITS : {}),
      ...(isWyoming && isElk ? WYOMING_ELK_UNITS : {}),
      ...(wyoResolved.unit && wyoResolved.key
        ? { [wyoResolved.key]: wyoResolved.unit }
        : {}),
    };

    const unitKey = wyoResolved.key
      || Object.keys(stateDataset).find(key => key.toLowerCase() === unitResolved.toLowerCase())
      // Antelope/elk are keyed "<area>-<type>"; a bare area number ("107", "7")
      // resolves to that area's preferred antlered product.
      //   antelope: rifle 1 > muzzle 0 > alt 2 > archery 9
      //   elk:      any-elk rifle 1 > archery 9 > type 2 > type 3
      || (isAntelope
        ? ['1', '0', '2', '9'].map(t => `${unitResolved}-${t}`).find(k => stateDataset[k])
        : isElk
        ? ['1', '9', '2', '3'].map(t => `${unitResolved}-${t}`).find(k => stateDataset[k])
        : undefined);
    const unitStats = unitKey ? stateDataset[unitKey] : null;
    const hasData = !!unitStats;
    const fallbackCoords = { lat: 42.6542, lng: -110.8234 };

    // ─── 5. SCOUT MODE ────────────────────────────────────────────────────────
    if (mode === 'SCOUT') {
      const hunterPoints = formData.points?.[stateRaw] ?? formData.points?.['WY'] ?? 0;
      const trophyFloor = parseInt(formData.trophyQuality || '0');
      const timeline = formData.drawTimeline || 'This Year';
      const huntStyle = formData.huntStyles?.join(', ') || 'Any';
      const fitness = formData.fitness || 'Moderate';

      // ── Weapon detection ──────────────────────────────────────────────────
      const weaponsRaw: string[] = [
        ...(Array.isArray(formData.weapons) ? formData.weapons : formData.weapon ? [formData.weapon] : [])
      ].filter(Boolean).map((w: string) => w.toLowerCase());
      const selectedHuntStyles = (formData.huntStyles || []).map((s: string) => s.toLowerCase());

      const isArcheryHunter = weaponsRaw.some(w => w.includes('bow') || w.includes('archery'))
        || selectedHuntStyles.some((s: string) => s.includes('archery'));
      const isMuzzleHunter = weaponsRaw.some(w => w.includes('muzzle')) && !isArcheryHunter;

      const allowedHuntTypeCodes = isArcheryHunter ? ['9'] : isMuzzleHunter ? ['1'] : ['1', '2', '3'];
      const weaponLabel = isArcheryHunter
        ? 'ARCHERY (Type 9 only)'
        : isMuzzleHunter
        ? 'MUZZLELOADER (Type 1)'
        : 'RIFLE (Types 1, 2, 3)';

      // Antelope weapon→type codes (1 rifle, 2 alt rifle, 9 archery, 0 muzzle/handgun).
      const allowedAntelopeTypes = isArcheryHunter ? ['9'] : isMuzzleHunter ? ['0'] : ['1', '2'];

      // ── Season detection ──────────────────────────────────────────────────
      const seasonsRaw: string[] = (formData.seasons || []).map((s: string) => s.toLowerCase());
      const wantsEarly = seasonsRaw.includes('early');
      const wantsMid = seasonsRaw.includes('mid');
      const wantsLate = seasonsRaw.includes('late');
      const seasonLabel = seasonsRaw.length > 0
        ? seasonsRaw.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' + ')
        : 'Any';

      const seasonContext = [
        wantsEarly ? 'Early season (September): archery rut, bulls vocal and bugling, thermals critical, high elevation timber and alpine parks' : '',
        wantsMid   ? 'Mid season (October): peak rut, most rifle seasons open, bulls moving hard all day, best trophy window for big bulls' : '',
        wantsLate  ? 'Late season (November+): post-rut, bulls on winter range at lower elevations, weather-driven movement, cold tolerance required' : '',
      ].filter(Boolean).join('. ');

      console.log("WEAPON DETECTION:", { weaponsRaw, isArcheryHunter, isMuzzleHunter, weaponLabel });
      console.log("SEASON DETECTION:", { seasonsRaw, seasonLabel, seasonContext });

      // ── Build scout dataset ───────────────────────────────────────────────
      // Wyoming Deer V2: use the adapter — returns 46 hunt products (17 regions + 29 LQ)
      // with notableUnits nested inside region entries. SCOUT sees real draw decisions,
      // not the 162 raw entries that include geographic substructure.
      const scoutDataset = isWyoming && isDeer
        ? buildWyomingDeerScoutDataset({ includeWhitetail: false })

        : isWyoming && isElk
        ? Object.entries(WYOMING_ELK_UNITS).map(([unitName, unit]) => {
            try {
              const history = [...(unit.drawHistory ?? [])].sort((a, b) => b.year - a.year);
              const latest = history[0] ?? null;
              const prior = history[1] ?? null;
              const huntTypeCode = unitName.includes('-') ? unitName.split('-')[1] : unitName;
              const unitNumber = unitName.includes('-') ? unitName.split('-')[0] : unitName;
              // Look up area pattern (GENERAL_ONLY / HYBRID / LQ_ONLY) from
              // the WGFD Chapter 7 classification. Region E/S/W entries are
              // NR-only constructs and don't map to a single area pattern;
              // mark them as 'NR_REGION'.
              const isNRRegion = unitName.startsWith('Region ');
              const areaInfo = isNRRegion ? null : getElkAreaInfo(unitNumber);
              const areaPattern = isNRRegion ? 'NR_REGION' : (areaInfo?.pattern ?? 'LQ_ONLY');
              const hybridUpgradeNote = areaInfo?.hybridUpgradeNote ?? null;
              return {
                unit: unitName,
                unitNumber,
                huntTypeCode,
                huntTypeLabel: unit.huntTypeLabel ?? '',
                typical: unit.typical ?? 'N/A',
                topEnd: unit.topEnd ?? 'N/A',
                trait: unit.trait ?? '',
                description: unit.description ?? '',
                tier: unit.tier ?? '',
                areaPattern,           // NEW: GENERAL_ONLY | HYBRID | LQ_ONLY | NR_REGION
                hybridUpgradeNote,     // NEW: explanation of upgrade for HYBRID areas
                residentOdds: latest?.resident?.approxOdds ?? 'N/A',
                residentOdds2025: latest?.resident?.approxOdds ?? 'N/A',
                residentOdds2024: prior?.resident?.approxOdds ?? 'N/A',
                residentQuota: latest?.resident?.quota ?? 'N/A',
                residentApplicants: latest?.resident?.firstChoiceApplicants ?? 'N/A',
                nrRegularMinPoints: latest?.nr_regular?.minPoints ?? 'N/A',
                nrSpecialMinPoints: latest?.nr_special?.minPoints ?? 'N/A',
                nrRegularOddsAtMin: latest?.nr_regular?.oddsAtMin ?? 'N/A',
                nrSpecialOddsAtMin: latest?.nr_special?.oddsAtMin ?? 'N/A',
                nrRandomOdds: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOdds2025: latest?.nr_random?.approxOdds ?? 'N/A',
                nrRandomOdds2024: prior?.nr_random?.approxOdds ?? 'N/A',
                nrSpecialRandomOdds: latest?.nr_special_random?.approxOdds ?? 'N/A',
                nrSpecialRandomQuota: latest?.nr_special_random?.quota ?? 'N/A',
                dataYear: latest?.year ?? 'N/A',
                priorYear: prior?.year ?? 'N/A',
                requiresGuide: unit.requiresGuide ?? false,
                guideNote: unit.guideNote ?? null,
                grizzlyPresence: unit.grizzlyPresence ?? false,
              };
            } catch (e) {
              console.error(`Error processing unit ${unitName}:`, e);
              return null;
            }
          })
          .filter((entry): entry is NonNullable<typeof entry> => {
            if (!entry) return false;
            // Hide NR Region General entries from resident hunters — those
            // are NR-only constructs that don't apply to residents.
            if (isResident && entry.areaPattern === 'NR_REGION') return false;
            const code = entry.huntTypeCode;
            if (code === '4' || code === '5') return false;
            if (code === 'general') return true;
            return allowedHuntTypeCodes.includes(code);
          })

        : isWyoming && isAntelope
        ? buildWyomingAntelopeScoutDataset(allowedAntelopeTypes)

        : Object.entries(stateDataset).map(([unitName, unit]: [string, any]) => ({
            unit: unitName,
            typical: unit.typical ?? 'N/A',
            topEnd: unit.topEnd ?? 'N/A',
            trait: unit.trait ?? '',
            description: unit.description ?? '',
            huntType: unit.huntType ?? '',
            seasons: unit.seasons ?? {},
            residentOdds: unit.residentDrawInfo?.approxOdds ?? 'N/A',
            residentOdds2025: unit.residentDrawInfo?.approxOdds ?? 'N/A',
            residentOdds2024: 'N/A',
            nrRegularMinPoints: unit.drawInfo?.regular?.minPoints ?? 'N/A',
            nrRandomOdds: unit.drawInfo?.random?.approxOdds ?? 'N/A',
            nrRandomOdds2025: unit.drawInfo?.random?.approxOdds ?? 'N/A',
            nrRandomOdds2024: 'N/A',
          }));

      // ── Build and send scout prompt ───────────────────────────────────────
      const promptParams: ScoutPromptParams = {
        stateName,
        speciesKey,
        isResident,
        hunterPoints,
        trophyFloor,
        timeline,
        huntStyle,
        fitness,
        weaponLabel,
        allowedHuntTypeCodes,
        seasonLabel,
        seasonContext,
        sacrificeTrophy: formData.sacrificeTrophy || '',
        knownAreas: formData.knownAreas || '',
        pastExperience: formData.pastExperience || '',
        hunterContext: formData.hunterContext || '',
        daysToHunt: formData.daysToHunt || '',
        scoutingAvailability: formData.scoutingAvailability || '',
        notes: formData.notes || '',
        includeSpecialDraw: formData.includeSpecialDraw !== false,
        grizzlyComfort: formData.grizzlyComfort !== false,
        scoutDataset,
        formData,
      };

      const scoutPrompt = buildScoutPrompt(promptParams);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: scoutPrompt }],
        temperature: 0,
        response_format: { type: "json_object" },
      });

      return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));
    }

    // ─── 6. BRIEF MODE — DRAW SUMMARY ────────────────────────────────────────
    // V2 logic: read draw data from wyoResolved.drawSource (parent region for
    // UNIT_IN_REGION, self for LQ/GENERAL_REGION), sorted year-descending so
    // `latest` is the newest year.
    let drawSummary = "NO OFFICIAL DATA AVAILABLE. Provide general draw advice only.";

    // ── Idaho: real controlled-hunt draw odds (IDFG) ────────────────────────
    // General deer/elk seasons are OTC/general (no draw); these are the
    // limited-entry hunts tied to the unit. Idaho is a pure random draw — no
    // preference/bonus points.
    if (isIdaho) {
      const hunts = idahoHuntsForUnit(speciesKey, unitResolved);
      if (hunts.length) {
        const lines = hunts.slice(0, 12).map(h =>
          `- Controlled Hunt ${h.hunt} (Area ${h.area}): ${h.tags} tags, ${h.applicants} first-choice applicants. Draw odds ~${h.oddsPct}% (resident ${h.resOddsPct}%, non-resident ${h.nonResOddsPct}%).`
        ).join('\n');
        drawSummary = `
          ### IDAHO CONTROLLED HUNT DRAW DATA (${IDAHO_DRAW_YEAR}) — Unit ${unitResolved} ${speciesLabel} ###
          Idaho ${speciesLabel} also has GENERAL/OTC seasons that require NO draw. The hunts below are the LIMITED-ENTRY controlled hunts tied to this unit — use these exact numbers, do not invent others:
          ${lines}
          DRAW SYSTEM: Idaho uses a PURE RANDOM draw — there are NO preference or bonus points. Residents and non-residents each have set permit allocations. Every year is a fresh lottery.
          ###########################################
        `;
      } else {
        drawSummary = `
          ### IDAHO DRAW — Unit ${unitResolved} ${speciesLabel} ###
          No limited-entry controlled hunts are tied to this unit for ${speciesLabel} in ${IDAHO_DRAW_YEAR}. Treat this unit as GENERAL SEASON: tags are over-the-counter or general (no draw). Idaho uses no preference points. Do not fabricate controlled-hunt numbers or odds.
          ###########################################
        `;
      }
    }

    // Deer resolves draw data via wyoResolved; antelope/elk V2 units carry their
    // own drawHistory on the resolved unitStats, so fall back to that.
    const drawUnit = wyoResolved.drawSource
      ?? (((isAntelope || isElk) && unitStats?.drawHistory?.length) ? unitStats : null);
    if (drawUnit?.drawHistory?.length) {
      const sortedHistory = [...drawUnit.drawHistory].sort((a, b) => b.year - a.year);
      const latest = sortedHistory[0];

      if (isResident) {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW (${latest.year}) ###
          - DRAW TYPE: Pure Random Draw — Wyoming residents do NOT use preference points for ${isAntelope ? 'antelope' : isElk ? 'elk' : 'deer'}.
          - RESIDENT QUOTA: ${latest.resident.quota} tags available.
          - FIRST-CHOICE APPLICANTS: ${latest.resident.firstChoiceApplicants}
          - APPROXIMATE ODDS: ${latest.resident.approxOdds ?? 'Unknown'}
          - STRATEGY: No point advantage exists. This is a pure lottery.
          ########################################################
        `;
      } else {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - WYOMING NR DRAW (${latest.year}) ###
          - NR REGULAR POOL: Quota=${latest.nr_regular.quota}, Min Points=${latest.nr_regular.minPoints ?? 'N/A'}, Odds at Min=${latest.nr_regular.oddsAtMin ?? 'N/A'}
          - NR SPECIAL POOL: Quota=${latest.nr_special.quota}, Min Points=${latest.nr_special.minPoints ?? 'N/A'}, Odds at Min=${latest.nr_special.oddsAtMin ?? 'N/A'}
          - NR RANDOM POOL: Quota=${latest.nr_random.quota}, First-Choice Applicants=${latest.nr_random.firstChoiceApplicants}, Odds=${latest.nr_random.approxOdds ?? 'N/A'}
          - NR SPECIAL RANDOM: Quota=${latest.nr_special_random.quota}, Odds=${latest.nr_special_random.approxOdds ?? 'N/A'}
          ${latest.nr_regular.notes ? `- NOTES: ${latest.nr_regular.notes}` : ''}
          ########################################################
        `;
      }

      // For UNIT_IN_REGION entries, make it clear the draw is regional
      if (wyoResolved.unit?.productType === 'UNIT_IN_REGION') {
        drawSummary += `\nNOTE: This is a specific geographic unit within Region ${wyoResolved.unit.parentRegion}. You apply for and draw the regional general tag, which is valid across all units in that region.\n`;
      }

      if (sortedHistory.length >= 2 && wyoResolved.key) {
        const trendBlock = buildDrawTrendBlock(drawUnit, wyoResolved.key, formData.residency || 'non-resident');
        drawSummary += `\n${trendBlock}`;
      }

    } else if (unitStats?.drawInfo) {
      const d = unitStats.drawInfo;
      if (isWyoming && isResident && isDeer) {
        const r = unitStats?.residentDrawInfo;
        drawSummary = r ? `
          ### MANDATORY SOURCE OF TRUTH - WYOMING RESIDENT DRAW ###
          - DRAW TYPE: Pure Random Draw — Wyoming residents do NOT use preference points for deer.
          - RESIDENT QUOTA: ${r.quota} tags available.
          - FIRST-CHOICE APPLICANTS: ${r.firstChoiceApplicants}
          - APPROXIMATE ODDS: ${r.approxOdds ?? 'Unknown'}
          - STRATEGY: No point advantage exists. This is a pure lottery.
          ########################################################
        ` : `
          ### WYOMING RESIDENT DRAW ###
          - DRAW TYPE: Pure Random Draw — no preference points for resident deer.
          ########################################################
        `;
      } else {
        drawSummary = `
          ### MANDATORY SOURCE OF TRUTH - DRAW DATA (WYOMING SYSTEM) ###
          - REGULAR POOL: Minimum ${d.regular?.minPoints ?? 'N/A'} points required.
          - SPECIAL POOL: Minimum ${d.special?.minPoints ?? 'N/A'} points required.
          - RANDOM POOL: ~${d.random?.approxOdds ?? 'N/A'} odds.
          ###########################################
        `;
      }

    } else if (unitStats?.utahDrawInfo) {
      const u = unitStats.utahDrawInfo;
      drawSummary = `
        ### MANDATORY SOURCE OF TRUTH - DRAW DATA (UTAH SYSTEM) ###
        - PERMIT TYPE: ${u.drawType}
        - POINTS TO GUARANTEE (approx): ${u.bonusPointsToGuarantee ?? 'Lottery/Random Only'}
        - NR RANDOM POOL ODDS: ${u.randomOddsNR ?? 'N/A'}
        - ADDITIONAL NOTES: ${u.notes}
        ###########################################
      `;
    }

    // ─── 7. GUARDRAILS & TRUTH BLOCK ──────────────────────────────────────────
    // Idaho "basics" lookup — gives Idaho units a real centroid + geo anchor even
    // before draw/trophy data is ingested, so the access grounding below is
    // located in Idaho (not the Wyoming fallback).
    const idahoUnit = isIdaho ? IDAHO_GMU_UNITS[unitResolved.toUpperCase()] : null;

    const geoAnchor = unitStats?.description
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${unitStats.description}.`
      : idahoUnit
      ? `GEOGRAPHIC ANCHOR: This unit is strictly located in: ${idahoUnit.description}`
      : `LOCATION: Analyze ${stateName} ${speciesLabel} Area ${unitResolved}.`;

    const trophyEstimated = unitStats?.dataCompleteness === 'NEEDS_TROPHY_DATA';
    const trophyInstruction = !hasData
      ? `EXPERT MODE: Provide realistic ${speciesLabel} trophy ranges for ${stateName} ${speciesLabel} Area ${unitResolved}.`
      : trophyEstimated
      ? `TROPHY ESTIMATE (region-level, not unit-sourced): Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}. Present these as an approximate regional estimate for this area — do NOT state them as precise, measured, unit-specific figures.`
      : `PRIMARY TRUTH DATA: Typical Mature: ${unitStats?.typical}, Top-End Potential: ${unitStats?.topEnd}, Key Trait: ${unitStats?.trait}.`;

    // Habitat metrics (V2) — pass through if available
    const habitatBlock = unitStats?.publicPct != null || unitStats?.buckPerHundredDoe != null
      ? `HABITAT METRICS: ${unitStats?.publicPct != null ? `${unitStats.publicPct}% public land` : ''}${unitStats?.wildernessPct ? `, ${unitStats.wildernessPct}% wilderness` : ''}${unitStats?.buckPerHundredDoe ? `, ${unitStats.buckPerHundredDoe}:100 buck-to-doe ratio` : ''}.${unitStats?.devNotes ? ` Notes: ${unitStats.devNotes}` : ''}`
      : '';

    // Wilderness / guide context — only surfaced for NR hunters, and only for Wyoming deer V2 entries
    let wildernessBlock = '';
    if (!isResident && isWyoming && isDeer && wyoResolved.key) {
      const wInfo = getWildernessInfo(wyoResolved.key);
      if (wInfo.status !== 'NONE' && wInfo.guideRuleForNR) {
        wildernessBlock = `WILDERNESS / GUIDE RULE (NR ONLY): ${wInfo.guideRuleForNR}`;
      }
    }

    // Real access features (OSM) + a real public-land % (sampled from BLM surface
    // ownership when we have no curated publicPct, e.g. Idaho). Both best-effort,
    // time-boxed, and run concurrently so they don't stack latency on the brief.
    // Ground the access lookup at the unit's real location. Prefer curated coords;
    // otherwise use the boundary centroid (any proxy state — ID/CO/…); the WY-area
    // fallback is a last resort so we never silently query the wrong state.
    const origin = new URL(req.url).origin;
    const curatedCoords = unitStats?.coords || idahoUnit?.coords || null;
    const briefCoords =
      curatedCoords ||
      (await getUnitCentroid(origin, stateRaw, speciesLabel, unitResolved)) ||
      fallbackCoords;
    const [accessSummary, sampledLand] = await Promise.all([
      getAccessSummary(briefCoords.lat, briefCoords.lng),
      unitStats?.publicPct == null
        ? getPublicLandPct(origin, stateRaw, speciesLabel, unitResolved)
        : Promise.resolve(null),
    ]);

    // Surface a public-land % only when the curated data lacks one (habitatBlock
    // already carries it for WY V2 units).
    const publicLandBlock = (unitStats?.publicPct == null && sampledLand?.publicPct != null)
      ? `PUBLIC LAND: approximately ${sampledLand.publicPct}% public land, computed from BLM surface ownership sampled across the unit (${sampledLand.sampled} points). Use this figure for the public/private split rather than guessing.`
      : '';

    const geographicGuardrails = `
      SPECIES: This is a ${speciesLabel} hunt in ${stateName}. EVERY section must be about ${speciesLabel} specifically — trophy scores, behavior, terrain use, and rut timing must all match ${speciesLabel}. NEVER write about mule deer (or any other species) unless ${speciesLabel} IS that species.
      ${geoAnchor}
      ${trophyInstruction}
      ${habitatBlock}
      ${publicLandBlock}
      ${wildernessBlock}
      ${accessSummary.text}
      ${drawSummary}
      USER STATUS: ${formData.residency}
      MANDATORY COMPLIANCE:
      1. NO MARKDOWN: section titles ALL CAPS. No asterisks. No hashtags.
      2. TRUTH ADHERENCE: You MUST use the exact numbers provided in the DATA blocks.
      3. SPECIES ADHERENCE: This is a ${speciesLabel} hunt. Do not describe any other species.
      ${isResident ? '4. NO GUIDE/WILDERNESS RULES: This hunter is a Wyoming resident. Wyoming Statute 23-2-401 does NOT apply. Do not mention guide requirements, wilderness guide rules, or outfitter requirements anywhere in the output.' : ''}
    `;

    // ─── 8. BRIEF PROMPT ──────────────────────────────────────────────────────
    const briefPrompt = `
${geographicGuardrails}

You are a master western hunting guide with decades of boots-on-ground experience. A hunter has drawn a ${speciesLabel} tag for ${stateName} Area ${unitResolved} and is counting on you for the real intel — not a generic overview. This brief is about ${speciesLabel} — every section must reflect ${speciesLabel} biology, trophy scoring, and behavior.

Write like a guide briefing a client the night before a hunt. Be direct, specific, and honest. If a unit has weaknesses, say so. If the draw odds are brutal, say so. Use plain language, not brochure language.

Generate a JSON object with a single key "brief" containing these sections. Headers in ALL CAPS. Plain text only. No asterisks, hashtags, or markdown.

REQUIRED SECTIONS:

1. UNIT OVERVIEW
What makes this unit unique. Where it sits geographically. What kind of country it is. What kind of hunter it rewards. 3-4 sentences — be specific to this unit, not a generic state overview.

2. DRAW ODDS & RESIDENCY
Use ONLY the numbers from the data block above. Explain the draw system clearly. Tell the hunter exactly what their odds are and why. If resident: explain the random draw system. If NR: explain all pools and what points are needed.

3. POPULATION AUDIT
Honest assessment of animal numbers in this unit. Population trend if known. What's driving density. Don't sugarcoat a struggling herd.

4. TROPHY AUDIT
Realistic expectations. Use the typical and top-end data provided. What does a good animal here actually look like. What age class is huntable.

5. SUCCESSFUL STYLES
What hunt styles consistently produce in this unit. Be specific. What does NOT work here and why.

6. TERRAIN & ACCESS
Specific terrain description and elevation range. For the road system, trailheads, and parking, use ONLY the named roads and the counts in the REAL ACCESS DATA block above — name the actual roads when describing how to get in. Do NOT invent trailhead names, forest-road numbers, or parking areas that are not in that block; if a category shows 0 or "none cataloged", say access is via unmaintained two-tracks or cross-country and that there are no formal trailheads. For the public/private split, use the public-land percentage from the HABITAT METRICS or PUBLIC LAND block above rather than guessing; if neither is present, do not state a specific percentage.

7. HERD BEHAVIOR
How animals use this unit through the season. Early season vs late. Rut timing if relevant. What changes their patterns.

8. SURVIVAL & LOGISTICS
Nearest town. Cell service reality. Water sources. Weather windows. What can go wrong and how to be ready.
`;

    const briefResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: briefPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const briefParsed = JSON.parse(briefResponse.choices[0].message.content || "{}");

    // ─── 9. TACTICAL + GEAR PROMPT ────────────────────────────────────────────
    const unitContext = unitStats ? `
UNIT INTELLIGENCE — USE THIS DATA TO DRIVE EVERY RECOMMENDATION:
- Unit: ${stateName} ${unitResolved}
- Species: ${formData.species}
- Location: ${unitStats.description}
- Terrain Trait: ${unitStats.trait}
- Typical Mature: ${unitStats.typical}
- Top End: ${unitStats.topEnd}
- Hunt Type: ${unitStats.huntType ?? 'N/A'}
- Archery Season: ${unitStats.seasons?.archery?.open ?? 'N/A'} - ${unitStats.seasons?.archery?.close ?? 'N/A'}
- Rifle Season: ${unitStats.seasons?.rifle?.open ?? 'N/A'} - ${unitStats.seasons?.rifle?.close ?? 'N/A'}
${unitStats.publicPct != null ? `- Public Land: ${unitStats.publicPct}%` : ''}
${unitStats.wildernessPct ? `- Wilderness: ${unitStats.wildernessPct}%` : ''}
${unitStats.buckPerHundredDoe ? `- Buck:Doe Ratio: ${unitStats.buckPerHundredDoe}:100` : ''}
` : `
UNIT: ${stateName} ${unitResolved}
Species: ${formData.species}
No structured data available — use expert knowledge for this specific unit.
`;

    console.log("UNIT CONTEXT BEING SENT:", unitContext);
    console.log("UNIT STATS:", JSON.stringify(unitStats));

    const tacticalPrompt = `
You are a master western hunting guide building a personalized tactical hunt plan and gear list. You have hunted this unit. You know this terrain. Everything you write is specific to this unit, this hunter, and this season.

${unitContext}

HUNTER PROFILE:
- Weapon: ${formData.weapon || formData.weapons?.[0] || 'Any'} — effective range: ${formData.weaponRange || 'not specified'}
- Hunt Style: ${formData.huntStyles?.join('/') || 'Backcountry'}
- Fitness: ${formData.fitness || 'Moderate'}
- Experience in Unit: ${formData.experienceInUnit || 'First time'}
- Hunting Party: ${formData.huntingParty || 'Solo'}
- Days Hunting: ${formData.daysToHunt || 5}
- Scouting Available: ${formData.scoutingAvailability || 'None'}
- Preferred Outcome: ${formData.preferredOutcome || 'Mature animal'}
- Budget: ${formData.budget || 'Not specified'}
- Guided or DIY: ${formData.guidedOrDIY || 'DIY'}
- Notes: ${formData.notes || 'None'}

BRIEF ALREADY GENERATED (use as context — do not repeat it):
${JSON.stringify(briefParsed.brief)}

TACTICAL RULES:
- If scouting days are available, open with a SCOUTING OVERVIEW section before Day 1
- Every day's plan must reference the specific terrain described in the unit data
- Desert/sage country: glassing sessions at first light, water source strategy, heat management
- Alpine/timber: elevation approach, thermal management, timber edges, transition zones
- Canyon/rimrock: wind reading, shadow hunting, bedding ledge locations
- Adjust approach distances and shooting setup based on weapon type and effective range
- Solo vs partner: adjust strategy accordingly
- First-time in unit: emphasize orientation and learning the terrain
- Returning hunter: focus on adjustments based on conditions and pressure

GEAR RULES:
- Every gear recommendation must be justified by this specific unit's terrain and conditions
- Do not list generic gear — explain why each item matters for Unit ${unitResolved}
- Always recommend a MTN HNTR Tripod for glassing and shooting support
- Desert terrain: water storage (volume specific), sun protection, long-range optics
- Alpine terrain: layering system, traction devices, weight reduction, weather protection
- Canyon terrain: quiet footwear, wind indicator, compact optics
- Budget context: ${formData.budget || 'not specified'}
- DIY: emphasize navigation, self-rescue, and communication tools

Generate a JSON object with exactly two keys:
"tactical": day-by-day hunt plan. Each entry has "title" and "plan" fields.
"gear": gear by category. Each category has "category" and "items" array. Each item has "item" and "reason" fields.

Headers in ALL CAPS. Plain text only. No markdown symbols.
`;

    const tacticalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: tacticalPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const tacticalParsed = JSON.parse(tacticalResponse.choices[0].message.content || "{}");

    return NextResponse.json({
      brief: briefParsed.brief,
      tactical: tacticalParsed.tactical,
      gear: tacticalParsed.gear,
      coords: unitStats?.coords || fallbackCoords,
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({
      error: "Engine failure during analysis generation.",
      details: error.message,
    }, { status: 500 });
  }
}