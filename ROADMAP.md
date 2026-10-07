# HuntQuarters Roadmap

_Last updated: October 5, 2026_

## Where this fits

HuntQuarters is the middle of the flywheel:

1. **huntaddicts.com** brings people in with reviews and stories.
2. **HuntQuarters** is the paid membership. Its AI tools help hunters draw better tags and make the most of them.
3. **Altitude Outdoors and MTN HNTR** sell them the gear.

Vizirack sits next to it and serves the same hunter.

The goal for this app is to sell a simple early membership to that audience. The AI tools can grow inside it.

## The deadline that matters

Western draw applications open in **January**. Most of them close between February and June. A hunter decides whether to pay for help during those months. If HuntQuarters can't take members and money by early January 2027, it misses a full year.

Every phase below is aimed at that date.

## Where it stands today

The draw data and features below date from June 30, 2026. Phase 0 cleanup was done October 5.

**Works now**
- A planner (`/planner`, also the front page) with a beta code gate and a per-IP rate limit.
- **SCOUT** picks units and **BRIEF** writes a full unit plan. Both use `gpt-4o` and are fed real draw data.
- **Draw data**

  | State | Species covered | Data |
  |---|---|---|
  | Wyoming | Deer, elk, antelope | 2025 draw data from WGFD |
  | Idaho | 6 species | 2025 controlled-hunt odds |
  | Colorado | 4 species | 2026 draw success % |
  | Montana | 6 species | 2026 draw success % |
  | Utah | Limited-entry units | Hand-entered |

- **E-scouting map**: unit boundaries, BLM land status, roads and trailheads from OpenStreetMap, and percent-public-land for each unit.

**Missing**
- No accounts, saved plans, database or payments. Stripe was taken out in June.
- Only 5 of the 17 target states have data.
- No tests.

## Target: 17 states

The goal is full coverage of the states western hunters apply in:

- **Western (11):** WY, ID, CO, MT, UT, NV, AZ, NM, OR, WA, CA
- **Plains (5):** SD, NE, KS, ND, OK
- **Alaska**

Launch in January with the states that are ready. Add the rest during the season, **in order of application deadline**, so each state goes live before hunters need it.

| Batch | States | Why this order | Approx. nonresident deadlines* |
|---|---|---|---|
| Live now | WY, ID, CO, MT, UT | Already have draw data | Jan 31 (WY elk) – early June |
| **A: before launch** | ~~AZ, NE, NM~~ (all live) | Earliest deadlines after WY elk | AZ elk/antelope early Feb; NE Feb–Mar; NM mid-March |
| **B: by March** | KS, ND, NV | Spring deadlines | KS April; ND elk/moose/sheep March; NV May |
| **C: by April** | OR, WA, CA, SD, OK | Late spring deadlines | OR May 15; WA late May; CA early June; SD and OK spring/summer |
| **D: by October 2027** | AK | Applications run Nov 1 – Dec 15 | Dec 15 |

\*Deadlines move every year. Check each state's agency before using them in the product.

Each new state needs:

- [ ] Draw odds or draw results for every species it offers
- [ ] Harvest success rates
- [ ] Unit boundaries (for the map)
- [ ] Point or bonus rules, including nonresident quotas and fees
- [ ] A spot check of SCOUT and BRIEF output against the agency's numbers

---

## Phase 0: Clean up (done October 5)

- [x] Real page title and description in `app/layout.tsx`.
- [x] Replace the boilerplate README.
- [x] Remove the fallback beta code from `lib/betaAccess.ts`. If the code isn't set, the gate stays closed.
- [x] Stop logging the full form on every request.
- [x] Stop using Wyoming coordinates when a unit can't be located. The access lookup is now skipped instead.
- [x] Mark Nevada, Arizona and New Mexico "Soon" in the planner.
- [x] Map note and `stateCode()` now cover Colorado and Montana.
- [x] Delete `app/api/recommend`, the unused Google Maps and Gemini packages, and the "backup branch" note.
- [x] GA4 tag. It loads when `NEXT_PUBLIC_GA_ID` is set.
- [ ] Create a GA4 property for HuntQuarters and set `NEXT_PUBLIC_GA_ID` in Vercel.
- [ ] Make sure `BETA_ACCESS_CODE` is set in Vercel. Without it, nobody can get in.
- [ ] Check that the Vercel deploy is live and see where huntquarters.com points.
- [ ] Pick one name. The beta gate says HuntQuarters, but the planner header says HuntEngine.

## Phase 1: Build for 17 states (October – November)

Each state today is a hand-written TypeScript file with its own shape. That won't hold up for 17 states.

- [x] **One data format for every state:** units, species, draw odds by point level, harvest success, boundaries and rules. (`lib/huntdata/schema.ts`)
- [x] **State registry** with all 17 states, their agencies and draw systems (`lib/huntdata/registry.ts`). Draw-rule notes for planned states are marked unverified until checked against the agency.
- [x] **Adapters** that read WY, ID, CO, MT and UT into the shared format without changing their existing prompts.
- [x] **Shared SCOUT and BRIEF builders** (`lib/huntdata/generic.ts`). A new state only has to produce its hunts and it gets SCOUT and BRIEF automatically.
- [ ] **Import scripts** that turn each agency's published files (PDF, CSV, KML) into that format. Next year's data then becomes a re-run, not a rewrite.
- [ ] Move WY, ID, CO, MT and UT onto the new format. Fix their gaps along the way:
  - [x] Harvest success rates for all five (`scripts/harvest/`, `lib/huntdata/harvest/`): WY 2025, CO 2025, ID 2025, MT 2025 (elk and antelope 2024), UT 2024. Shown in SCOUT and BRIEF.
  - [ ] Utah: confirm which DWR hunts match "Plateau" antelope and "Uintas East Moose" (no harvest rate until then)
  - [ ] Colorado preference-point data (points needed to draw, not just success %)
  - [ ] Utah: DWR's published draw odds in place of hand-entered numbers
  - [ ] Wyoming antelope: trophy and season data
  - [ ] Retire the old `HUNT_DATA` stubs
- [ ] **One map boundary source per state**, set up in config instead of code.
- [x] **Tests** (`npm test`): every live state's data passes validation, spot checks match source numbers, and the shared builders work.
- [x] **SCOUT unit guard:** any unit the AI makes up is dropped before the hunter sees it.
- [ ] Colorado bighorn sheep and mountain goat hunts (none loaded today).
- [ ] Break up the planner (70KB) and prompt builder (80KB) so new states don't make them bigger.

## Phase 2: Membership launch + Batch A (December – early January)

- [ ] **Batch A states:** AZ, NE, NM.
- [ ] **Accounts:** sign up and log in. These replace the beta code.
- [ ] **Saved plans:** members can come back to their SCOUT results and BRIEFs.
- [ ] **Payments:** bring Stripe back.
- [ ] **Usage limits for each member**, stored in the database, to keep OpenAI costs in check.
- [ ] **Landing page** on huntquarters.com that lists the states covered and the ones coming next.
- [ ] **Links from huntaddicts.com** articles into the planner.

## Phase 3: Application season (January – June 2027)

- [ ] **Batches B and C**, each going live ahead of its deadlines.
- [ ] **Deadline calendar** for all 17 states, with email reminders.
- [ ] **Points tracker:** members enter their points once for every state, and every plan uses them.
- [ ] **Multi-state planning:** "where should I apply this year?" across all states at once. The planner handles one state at a time today.

## Phase 4: After the draw (June – October 2027)

- [ ] "I drew a tag" mode with deeper e-scouting for that one unit.
- [ ] Gear lists that link to Altitude Outdoors and MTN HNTR.
- [ ] Find where Vizirack fits, for example scoring the animal after the hunt.
- [ ] **Batch D: Alaska**, live before applications open November 1.
- [ ] Load 2027 draw results for every state with the import scripts.

---

## Open decisions

- **Price and tiers** for the membership.
- **Login and database provider.** GeoMutt already uses Supabase, so that's the easy default.
- **AI model.** Every call uses `gpt-4o`. It's worth comparing cost and quality against newer models before members put real load on it.
- **Batch order.** The table above follows deadlines. Change it if member demand points somewhere else.
- **What huntquarters.com shows today**, and whether it should point to the app.
