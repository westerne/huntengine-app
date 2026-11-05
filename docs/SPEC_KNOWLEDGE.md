# Knowledge plan: what the advisor has to know

Status: draft for review, 2026-11-04. Companion to docs/SPEC_ARCHITECTURE.md (the journey: **Find → Acquire → Scout → Hunt**, with tracking and decisions throughout) and docs/BRAND.md.

The difference we're betting on is an AI advisor that helps hunters make decisions a filter can't: "burn my points or wait", "which new states for $1,500 a year", "I drew — now what". That only works if it stands on knowledge that is **accurate, sourced, dated and current**. This plan lists every dataset it needs, what we have, the gap, the source, how often it changes, and the priority.

## Rules for every dataset
1. **Sourced.** Facts come from agency or government sources (or content we own). Each record keeps its source URL and, for rules, a quote.
2. **Dated.** Each dataset has a `checkedOn` date and a refresh schedule. Stale data shows as stale, never as current.
3. **Honest about quality.** Thin data is labeled (the Confidence meter and one Caveat), never filled in. No invented odds, dates, fees, rules or trophy figures.
4. **One source of truth.** Screens and the advisor read the same data through the same functions, so they never disagree.
5. **Respect sources.** Public pages only, follow each site's terms, no getting around blocks. Never relay specific hunting spots or GPS points.

Status key: ✅ have · ⚠️ partial · ❌ missing.

## A. States and the draw

| # | Dataset | Status today | Gap | Source | Changes | Priority |
|---|---|---|---|---|---|---|
| A1 | Draw systems & points rules | ✅ All 17 states verified with quotes (`lib/huntdata/registry.ts`, `draw/*-research.md`) | Waiting periods and point-loss rules only partly captured as data | Agency regs, admin code | Yearly (regs) | P2 |
| A2 | Resident-only species, once-in-a-lifetime, NR caps | ⚠️ ND/SD/NE resident-only, AK hunt-level, CA/OR caps in notes | Structured per state & species | Agency regs | Yearly | P2 |
| A3 | **Application deadlines** | ⚠️ `applications.json` covers **8 of 17 states**, only **2** dates for 2027 | All 17 states, every species group, with time zone and source | Agency application pages | Yearly; most post Dec–Feb (AK applies Nov 1–Dec 15) | **P0** |
| A4 | **Fees & license prerequisites** | ❌ | Application fee, point fee, tag fee, required license first (e.g. hunting license to earn a point), by residency | Agency fee schedules | Yearly | **P0** |
| A5 | Application links & how-to | ⚠️ Same 8 states | All 17 | Agency sites | Yearly | P0 |
| A6 | **OTC, general & leftover tags** | ⚠️ WA general seasons; AK general/registration | Every state: OTC/general seasons, leftover & second-draw lists with dates, NR quotas | Agency regs and leftover pages | Yearly; leftovers Jun–Aug | **P1** |
| A7 | Harvest-reporting rules | ✅ Most states (`harvestReporting.json`) | KS deer/elk, NE bighorn (sites block automated access) | Agency regs | Yearly | P3 |

## B. Units and hunts

| # | Dataset | Status today | Gap | Source | Changes | Priority |
|---|---|---|---|---|---|---|
| B1 | Draw odds by hunt | ✅ Most states (`draw/*.json`, hand-built WY/ID/CO/MT/UT); quality varies and is labeled | Refresh as results post | Agency draw statistics | Yearly, Feb–Jul as draws finish | P1 (refresh) |
| B2 | Point tables / cutoffs | ⚠️ Some states | Wherever published | Agency draw reports | Yearly | P2 |
| B3 | Hunter success | ✅ Most states (`harvest/*.json`) | Refresh | Agency harvest reports | Yearly, ~Jan–May | P1 (refresh) |
| B4 | Unit boundaries | ✅ Most (`app/api/boundary`) | SD (no public layer), 8 small OK areas | Agency / federal GIS | Rarely | P3 |
| B5 | Season dates per hunt | ⚠️ Some states | All hunts | Agency regs | Yearly (spring) | P1 |
| B6 | **Trophy potential** | ❌ Withheld on purpose (no sourced figures) | Sourced indicators only: harvest age, antler-point/class data, bull:cow & buck:doe ratios where states publish them; record-book data only under license | Agency harvest/herd reports; Boone & Crockett / Pope & Young (licensed) | Yearly | P2 |
| B7 | **Land ownership** | ⚠️ Rough BLM land-status sample | Public/private/state/federal/wilderness share per unit | USGS PAD-US (national protected areas), BLM | Yearly | **P1** |
| B8 | **Access** | ⚠️ OSM roads/trailheads near the unit center | State access programs (MT Block Management, WY Walk-In, KS WIHA, NE Open Fields, CO SWAs…), seasonal road closures, landlocked public land | State program GIS, USFS/BLM travel maps, OSM | Yearly | P1 |
| B9 | Terrain & wilderness | ⚠️ Thin | Elevation range, wilderness share (WY requires a guide for non-residents in wilderness), road density | USGS elevation, wilderness boundaries | Rarely | P2 |
| B10 | Unit deep dive (what hunters say) | ❌ | Summarized themes with dated sources: pressure, access problems, conditions, herd health — never spots | Public web, agency biologist reports, local news | On demand, per request | P2 (by April) |

## C. The hunter

| # | Dataset | Status today | Gap | Priority |
|---|---|---|---|---|
| C1 | Home state, weapons, fitness, points, plan, past reports | ✅ (`profiles`, `hunter_points`, plan items, saved hunts, `hunt_reports`) | — | — |
| C2 | Goals | ⚠️ Setup answers (species, states, wait, bucket list, known units) | Trophy vs. meat vs. experience, new states vs. known ground | **P1** |
| C3 | Constraints | ⚠️ `typical_budget` column exists but nothing asks for it | **Budget per year, time off and when, travel distance, hunting partners, physical limits** | **P1** |
| C4 | Experience | ⚠️ `experience` text | By species and terrain; guided vs. DIY | P2 |
| C5 | Gear owned | ❌ | What they already have, so recommendations don't repeat it | P3 |
| C6 | Advisor memory | ❌ | Facts the hunter tells the advisor ("one week off, in October") saved to their profile, visible and editable by them | P1 (with the advisor) |

## D. Know-how: gear, tactics, action plans, education

| # | Dataset | Status today | Gap | Source | Priority |
|---|---|---|---|---|---|
| D1 | **Tactics library** | ❌ (plans are AI-written from general knowledge) | By species × season × terrain × weapon: glassing, calling, rut timing, pressure, weather | Our own write-ups from agency and public educational sources, cited; owner reviews | **P1** |
| D2 | **Gear library** | ❌ | Curated lists by hunt type (deferred by the owner) | Owner-curated | Later |
| D3 | Action-plan templates | ⚠️ One plan per hunt | Timeline from apply-by → training → scouting weekends → logistics → hunt week → after | Our own templates, owner reviews | P2 |
| D4 | **Education** | ❌ | Plain explainers for every term (preference vs. bonus vs. squared points, OTC, leftover, NR caps…); a 2-minute primer per state built from A1–A6; a starter path for newer hunters | Our verified rules (A) + our own write-ups; owner reviews | **P1** |
| D5 | Meat care, safety, regs reminders | ⚠️ In hunt plans | Curated checklists | Agencies, our own write-ups | P3 |

## E. How the advisor uses it
The advisor answers from **tools**, not memory. Each tool reads the datasets above:

`search_hunts` · `get_hunt` (odds, success, land, access, season, trophy indicators) · `odds_at_points` · `project_points` · `compare_hunts` · `state_rules` · `deadlines` · `fees` · `otc_options` · `harvest_reporting` · `my_profile` / `my_plan` / `my_reports` · `search_library` (tactics, gear, primers) — and, with the hunter's OK: `add_to_plan` · `set_reminder` · `start_application` · `remember` (save a fact to their profile).

Every answer leads with a recommendation, then the tradeoff, then the next step; cites what it used; and says plainly when we don't know and to check with the agency.

## F. Refresh calendar
| When | What to refresh |
|---|---|
| **Nov** | Alaska drawing results (in the new supplement, ~Nov 1); Alaska applications open Nov 1–Dec 15 |
| **Dec – Feb** | Next year's **deadlines, fees, application links** (A3–A5) as states post them; new regs |
| **Jan – May** | Last season's **hunter success** (B3) |
| **Feb – Jul** | **Draw results/odds** (B1–B2) as each state finishes its draw |
| **Spring** | **Season dates** (B5), access-program maps (B8) |
| **Jun – Aug** | **Leftover and second-draw lists** (A6) |
| **Ongoing** | Library additions (D), deep dives on request (B10) |

Each refresh runs as an agent research pass (official sources only, quotes kept, spot-checked); **the owner signs off before it goes live.**

## G. Priority summary
- **P0, before January:** deadlines, fees, license prerequisites and application links for all 17 states (A3–A5). This is what "apply in new states" depends on, and the season opens in January.
- **P1:** OTC/leftover catalog (A6); season dates (B5); land ownership and access (B7–B8); hunter goals and constraints (C2–C3); tactics library and education (D1, D4, our own content); yearly refreshes of odds and success.
- **P2:** trophy indicators (B6, plus the B&C / P&Y license); terrain/wilderness (B9); unit deep dive (B10, by April); action-plan templates (D3); points-rule details (A1–A2). Gear (D2) later.
- **P3:** remaining boundaries and blocked rules; gear owned; safety checklists.

## Owner decisions (2026-11-04)
1. **HuntAddicts articles will not be used.** The tactics and education library (D1, D4) is our own: drafted from agency and other public educational sources with citations, and reviewed by the owner before it goes live.
2. **Trophy potential: pursue a Boone & Crockett / Pope & Young data license** (probably). Until it's in place, show only state-published indicators (B6).
3. **Gear (D2) is deferred.**
4. **The owner signs off on every data refresh** before it goes live.
