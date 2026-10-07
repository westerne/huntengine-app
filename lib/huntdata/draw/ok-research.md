# Oklahoma (ODWC) — controlled-hunt draw, harvest and map layers (research notes)

Researched 2026-10-07. Sources: Oklahoma Department of Wildlife Conservation only (wildlifedepartment.com and
ODWC's own ArcGIS Online org `jRf8jjFwxedITdFe`, owner `ODWC_GIS`). curl got every page and file with a normal
User-Agent. There was no bot challenge and nothing was bypassed.

Data files: `draw/ok.json` (2025 drawing, 2025-26 hunts) and `harvest/ok.json` (2025 controlled-hunt results).
They were built by a one-off Python script (in the session scratchpad, not in the repo). The script reads the sources below.

---

## 1. Sources

| What | URL |
|---|---|
| Per-hunt draw data (2025-26): JS data tables in the article "Crunch the Numbers and Up Your Drawing Odds" | https://www.wildlifedepartment.com/outdoorok/ooj/increase-your-winning-odds-controlled-hunts |
| Controlled Hunts hub (application period, links to results) | https://www.wildlifedepartment.com/hunting/controlledhunts |
| 2025 controlled-hunt harvest results, CSV | https://www.wildlifedepartment.com/sites/default/files/2026-04/2025%20Controlled%20Hunts%20Results.csv |
| Same, PDF | https://www.wildlifedepartment.com/sites/default/files/2026-04/2025%20Controlled%20Hunts%20Results.pdf |
| Rules: before you apply | https://www.wildlifedepartment.com/hunting/controlledhunts/need-to-know |
| Rules: preference points | https://www.wildlifedepartment.com/hunting/controlledhunts/prefpt |
| Fees | https://www.wildlifedepartment.com/hunting/controlledhunts/cost |
| After you apply (results date) | https://www.wildlifedepartment.com/hunting/controlledhunts/post-application |
| Step-by-step (2026-27 hunt list, license rule) | https://www.wildlifedepartment.com/hunting/controlledhunts/step-by-step |
| Landowner antelope drawing | https://www.wildlifedepartment.com/hunting/controlledhunts/landowner-antelope |
| Big game regs (E-Check rule) | https://www.wildlifedepartment.com/hunting/regs/big-game-regulations |
| Elk season regs (OTC zones) | https://www.wildlifedepartment.com/hunting/regs/elk-big-game-season |
| Antelope season regs | https://www.wildlifedepartment.com/hunting/regs/antelope-big-game-season |
| 2025-26 Big Game Harvest Report (statewide/county counts) | https://www.wildlifedepartment.com/outdoorok/ooj/2025-26-big-game-harvest-report |

## 2. How each field was derived

### draw/ok.json (year 2025)
The ODWC article puts the per-hunt draw stats in inline `const DATA = [...]` arrays, one per category. Each row is
`[Location & Permit, Hunt Type, Begin, End, Hunt #, Applicants, Permits, Draw Ratio]`. Five arrays were used: Deer
(75 hunts), Youth Deer (41), Deer for Nonambulatory/Motor Vehicle (13), Elk (9) and Pronghorn (4). The two turkey
arrays are out of scope.

- **Totals check:** the row sums match ODWC's printed category totals exactly. Deer: 69,199 applicants / 3,708
  permits. Youth deer: 4,173 / 812. Non-ambulatory deer: 342 / 114. Elk: 37,906 / 306. Pronghorn: 13,501 / 40.
  Every Draw Ratio equals applicants ÷ permits (asserted in the build).
- `huntCode` = ODWC hunt number ("1020").
- `tags` = Permits.
- `applicants` = Applicants. **These are not first-choice counts.** ODWC says the totals include all choice
  selections: 1st–3rd for elk, youth and non-ambulatory; 1st–2nd for pronghorn; 1st–5th for deer.
- `draw.resident` / `draw.nonresident` = `null`. Residents and nonresidents apply into one pool, and ODWC publishes
  no split by residency, so the combined counts go in `tags` / `applicants`.
  - `successPct` is not set. ODWC prints only "Draw Ratio, 1 in X", which is based on all-choice applicants.
  - `minPoints` and `pointLines` are not set. ODWC publishes no data by point level.
- `unit` = the hunt area, with light cleanup so draw and harvest use the same name:
  - "Wichita Mts. NWR" and "Wichita Mountains WR" become "Wichita Mountains NWR"
  - "Ft." becomes "Fort"
  - "COE" becomes "CoE"
  - "Beaver River WMA, McFarland Unit" becomes "Beaver River WMA McFarland Unit"
  - "Texoma CoE (Burns Run/Lakeside)" becomes "Texoma CoE"
  - The full ODWC location string stays in `label`. Antelope units are "Cimarron County" and "Texas County".
- `weapon`: "Gun" → `rifle` (any legal firearm, same convention as NV "Any Legal Weapon"). Muzzleloader →
  `muzzleloader`. Archery → `archery`. Youth "Shotgun" and "Muzzleloader/Shotgun" hunts get no weapon.
- `season`: Begin/End dates from the same tables, as ISO dates.
- Counts: ELK 9, ANTELOPE 4, DEER 129 (75 regular + 41 youth + 13 motor-vehicle/non-ambulatory).

### harvest/ok.json (year 2025)
Source: "Results from 2025 Controlled Hunts" (CSV, same as the PDF). It reports **controlled hunts only**, one row
per **area and method** (A/M/G), with columns # Permits & Type, # Hunters, Antlered, Antlerless. It has no hunt number.

- `hunters` = # Hunters.
- `harvest` = Antlered + Antlerless.
- `successPct` = harvest ÷ hunters × 100, rounded to 0.1. This is computed here, because ODWC prints only counts.
- **Only single-animal permits are kept.** These rows were left out:
  - 2-deer permits ("(2)"): harvest ÷ hunters there is deer per hunter, not hunter success.
  - Rows with no harvest printed: Tishomingo NWR gun, Great Salt Plains SP archery.
  - Rows with 0 hunters.
  - Rows ODWC prints as single permits whose matching draw hunts are 2-deer: Little River NWR gun 3160/3161, Pine
    Creek WMA youth 5130.
  - Special Family deer (all 2-deer).
  - Turkey.
- `huntCode` is set only when exactly one draw hunt has the same area, weapon, category and permit count. Elk and
  antelope were matched by area plus permit type.
  - Rows where ODWC pooled several hunts carry the area as `unit` and no `huntCode`. Examples: Wichita walk-in elk
    1030/1040/1050 and 1031/1041/1051; Cherokee GMA 3044 + 3046; Cookson either-sex + antlerless.
- Counts: ELK 6 (3 with huntCode), ANTELOPE 4 (4), DEER 43 (27).
- **OTC deer:** the 2025-26 Big Game Harvest Report gives deer harvest by county (E-Check counts, private land) and
  statewide hunter success by method (a chart only, from the Game Harvest Survey). It gives no hunters or success
  rate per county or zone, so there are **no OTC rows**. The same goes for OTC elk zones and archery pronghorn.

## 3. Draw system rules (verified, with quotes)

- **Points: weighted random, not highest-first.** [prefpt] says the system is "not a true preference system". It
  makes it more likely that people with the most points get drawn, "but there is still a chance that hunters with
  no points can get drawn". Each point "acts like an extra application". You earn a point in a category when you are
  not drawn. Points clear when you are drawn (unless you bought PointGuard). Points are forfeited "if you do not
  apply for five years in a row". There is no maximum. You can buy one extra point per category ($10 resident / $50
  nonresident) and choose "Preference Point Only".
- **Elk/pronghorn 20+ point pool.** [need-to-know] "an initial drawing for half of all hunt permits will be taken
  from the pool of only those applicants having 20 or more preference points". The rest are drawn from everyone.
- **Once in a lifetime.** [need-to-know] "Since elk and antelope hunts are once-in-a-lifetime hunts, successful
  applicants are never again eligible to apply for those categories."
- **Draw order.** "Elk hunts are drawn first, followed by antelope, then deer". You can win only one big-game
  category per year.
- **Groups.** Average points are used. Groups of up to 4 for deer and non-ambulatory deer. Elk is single, except
  walk-in hunts (2). Pronghorn and youth: single only.
- **Residency eligibility, every category.** [need-to-know / step-by-step] "all applicants (residents and
  non-residents) must possess a valid Oklahoma hunting license for the current calendar year of the drawing (unless
  exempt)". Nonresidents may apply for elk, pronghorn and deer controlled hunts. ODWC lists no residency quota or
  split.
  - Application fee: $10 resident / $50 nonresident [cost]. Pages differ: some say $10 for everyone.
  - If drawn, nonresidents pay $506 for elk or antelope, $501 for deer, plus a $50 permit fee [cost].
  - Youth deer (Category 5): age 15 or younger on the first day of the hunt.
  - Wichita Mountains NWR hunts: minimum age 18.
- **Application window: April.** [controlledhunts] "Application Period: April 1–May 20, 2026". Applications are
  online only at GoOutdoorsOklahoma.com. Results go out "after June 10" [post-application].
- **Landowner antelope:** a separate drawing (March 9–30, 2026) for owners or operators of 160+ acres in Cimarron or
  Texas County. It is not once in a lifetime, and no statistics are published.
- **OTC context:**
  - Rifle antelope is "only available through the Department's controlled hunts program or through the Landowner
    Permit Drawing". Archery antelope is OTC.
  - Elk on private land in open zones is OTC (both residencies) with zone quotas.
  - Statewide deer seasons are OTC.

**DRAW RULES (OK), plain English:**
> Oklahoma's controlled hunts are a weighted lottery. Every year you apply and miss, you earn a preference point.
> Each point is one more entry next year, but people with zero points can still draw. Residents and nonresidents
> apply in the same pool. Everyone must hold an Oklahoma hunting license for the current year before applying. Apply
> online from April 1 to about May 20, and results come out in mid-June. Elk and pronghorn controlled hunts are once
> in a lifetime. Half their permits go first to applicants with 20 or more points. Elk is drawn first, then
> pronghorn, then deer, and you can win only one of the three a year. Points expire if you skip five years in a row.

## 4. Uncertain / not published

- The **2026 drawing (June 2026)** has no per-hunt stats published yet. The newest is the 2025 drawing, in an
  article posted April 2026. The step-by-step page lists the 2026-27 hunts (permits only, no applicants).
- **Applicants include lower choices.** Odds from `tags`/`applicants` are ODWC's "draw ratio", not first-choice
  odds. It is unclear whether group applications count as one applicant or several.
- **Permit counts differ between the draw and harvest tables.** Wichita walk-in elk: 100 either-sex / 225 cow in the
  harvest table vs 3 × 20 / 3 × 45 drawn. Walk-in elk parties can be 2 hunters. The harvest table also lists hunts
  with no draw row: Gruber CGTC/Cherokee WMA elk, and Beaver River whitetail-only. These numbers were not reconciled.
- **McAlester AAP youth deer** harvest includes federal-base drawn hunters (ODWC footnote). It is kept, with a note
  in the label.
- **Cimarron doe-only pronghorn** shows 1 antlered harvested. That is ODWC's figure, copied as printed.
- Hunter success is **computed** (harvest ÷ hunters). ODWC does not print a success percentage.

## 5. Spot checks (re-fetched live 2026-10-07 and compared to the JSON)

| Record | Source row | JSON |
|---|---|---|
| Elk 1020 | `"Wichita Mountains WR - Bull","Gun","12/2/2025","12/4/2025",1020,8668,40,216.70` | unit Wichita Mountains NWR, rifle, 2025-12-02–12-04, tags 40, applicants 8668 ✔ |
| Pronghorn 2010 | `"Texas County - Either Sex","Gun","9/4/2025","9/7/2025",2010,5483,5,1096.60` | Texas County, tags 5, applicants 5483 ✔ |
| Deer 3340 | `"Wichita Mountains WR - Antlered Only","Gun",...,3340,8067,30,268.90` | tags 30, applicants 8067 ✔ |
| Deer 3171 | `"McAlester AAP - 2 (Only 1 Antlered)","Archery","10/17/2025","10/19/2025",3171,1980,275,7.20` | archery, tags 275, applicants 1980 ✔ |
| Youth deer 5006 | `"Beaver River WMA, McFarland Unit - Either-Sex","Gun",...,5006,145,15,9.67` | tags 15, applicants 145 ✔ |
| Non-amb deer 4001 | `"Cherokee GMA - Either Sex","Gun",...,4001,50,40,1.25` | tags 40, applicants 50 ✔ |
| Harvest elk 1020 | CSV `,Wichita Mts. NWR,40 Bull Only,40,35,0` | hunters 40, harvest 35, 87.5% ✔ |
| Harvest pronghorn 2002 | CSV `,Cimarron Co.,15 Doe Only,11,1,7` | hunters 11, harvest 8, 72.7% ✔ |
| Harvest deer 3001 | CSV `G,Atoka WMA,30 Either-Sex,25,5,2` | hunters 25, harvest 7, 28.0% ✔ |
| Harvest deer 3030 | CSV `G,Canton WMA,75 Either-Sex,54,23,3` (PDF same) | hunters 54, harvest 26, 48.1% ✔ |

## 6. Boundary layers (ODWC official ArcGIS, public)

ODWC has **no hunt-unit layer** for controlled hunts. The hunts are on named properties. The usable official layers:

**WMA boundaries.** Used by ODWC's public "WMA Viewer" (Experience item `26144eb0a1794981a85aa1802a079448`, linked
from wildlifedepartment.com/hunting/wma).
- Layer: `https://services1.arcgis.com/jRf8jjFwxedITdFe/arcgis/rest/services/Public_WMA_Boundaries/FeatureServer/1`
  (layer name `Public_WMA_Boundaries_09232026`; the layer id is **1**, not 0).
- Key field: **`SHORTNAME`** (string), e.g. "Cookson", "Cherokee", "Osage Western Wall", "Atoka WMA". The full name
  is in `WMANAME` ("Cookson Wildlife Management Area"). Other fields: `WMATYPE` (WMA/PFA/PHA/WMU/Other),
  `OWNERSHIP`, `REGION`, `ACRES`. There are 105 features.
- Mapping: drop " WMA" or " GMA" from the draw `unit`. 18 draw units match `SHORTNAME` directly.
  - Exceptions: "Atoka WMA" is `SHORTNAME='Atoka WMA'`. "McCurtain Co. WA" is 'McCurtain County'. "Fort Cobb WMA
    and SP" is 'Fort Cobb'.
  - Not in the layer: NWRs, CoE parks, McAlester AAP, Nature Conservancy preserves, state parks, USDA Grazinglands,
    Camp Gruber.
- Test (2026-10-07):
  `curl "https://services1.arcgis.com/jRf8jjFwxedITdFe/arcgis/rest/services/Public_WMA_Boundaries/FeatureServer/1/query?where=SHORTNAME%3D%27Cookson%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"`
  → 1 feature (Polygon), WMANAME "Cookson Wildlife Management Area".

**Antelope units (counties).** Use `OK77counties` (owner ODWC_GIS, "All 77 Counties of Oklahoma").
- Layer: `https://services1.arcgis.com/jRf8jjFwxedITdFe/arcgis/rest/services/OK77counties/FeatureServer/2`
- Key field: **`COUNTY`**, in title case ("Cimarron", "Texas"). `CTFIPS` = "40025" / "40139". Native SR 102039;
  ask for `outSR=4326`.
- Test: `...OK77counties/FeatureServer/2/query?where=COUNTY%3D%27Cimarron%27&outFields=COUNTY,CTFIPS&returnGeometry=true&outSR=4326&f=geojson`
  → 1 Polygon. The same query with 'Texas' → 1 Polygon.
- The antelope rifle area is "Cimarron County and that portion of Texas County west of State Highway 136". No ODWC
  layer for that line was found.

## 7. Harvest reporting (check) rule: mandatory

- Species: deer, elk, antelope (and turkey). Deadline: **within 24 hours of leaving the hunt area**, before
  processing. Use E-Check (GoOutdoorsOklahoma.com or the app) or an authorized Department employee.
- Source: https://www.wildlifedepartment.com/hunting/regs/big-game-regulations, "Checking Requirements":
  > "All deer, elk, antelope, and turkey must be checked within 24 hours of leaving the hunt area prior to processing the carcass."
- Once checked, the hunter gets a carcass tag or confirmation number. It must stay with the carcass to its final
  destination.
- I found no separate mandatory post-season report on the pages I checked. ODWC's Game Harvest Survey (cited in the
  harvest report) is a sample survey, but whether answering it is required was not checked.
