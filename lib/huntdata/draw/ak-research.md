# Alaska (ADF&G) — drawing permits, rules and GMU map

Researched 2026-10-07 from Alaska Department of Fish and Game sources only (adfg.alaska.gov, its PDFs, and ADF&G's own ArcGIS server). ADF&G pages reject curl's default user agent ("Request Rejected"); a normal browser user-agent string works. There was no bot challenge.

## Data used in ak.json

**Year: the 2025 drawing.** That drawing took applications Nov. 1 – Dec. 16, 2024, announced results in February 2025, and covered hunts in regulatory year 2025-26. It is the newest drawing ADF&G has published counts for.

1. **Draw numbers.** These come from the table "Results of the 2025 Permit Hunt Drawing" on page 20 of the *2026-2027 Alaska Drawing Permit Hunt Supplement*: https://www.adfg.alaska.gov/static/applications/web/nocache/license/huntlicense/pdfs/2026-2027-draw-supplement.pdfE0F489F5D9C7542D56D78BEAF3516DFD7F1841BF6EC406CB6BF475BA700E1460/2026-2027-draw-supplement.pdf (linked from https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawsupplements).
   - Each hunt has four columns: Hunt Number, Apps Received, Permits Available and % Drawn. The page says "Permits Available column may be different than what was advertised".
   - The table is a 7-column grid, so I parsed it by word coordinates (pdfplumber). That gave 361 hunts. I then checked every row: the published % Drawn matches Permits ÷ Apps within 1 point (with "<1" meaning under 1%). All 361 passed.
   - Bears (DB, DL) are excluded. That leaves **219 rows**.
2. **Unit, area, legal animal and who can apply.** These come from ADF&G's per-hunt pages, which describe Regulatory Year 2026: `https://www.adfg.alaska.gov/index.cfm?adfg=huntingmaps.find_hunt&huntnum=<CODE>`. I used the "GMU, Area", "Legal Animal" and "Residency Restrictions" fields.
   - Eight hunts from the 2025 drawing have no 2026 page: DG856, DI403, DM612, DS003, DS030, DS150, DS233 and DS238. For those I took the same fields by hand from the *2025-2026 Alaska Drawing Permit Hunt Supplement*: https://www.adfg.alaska.gov/static/license/huntlicense/pdfs/2025-2026_draw_supplement.pdf
3. **Weapon restrictions and guide rules for nonresidents.** These come from the "Certified Bowhunters/Muzzleloader/Shotgun/Crossbow Only" notes and the guide notes in the 2025-2026 supplement, cross-checked against the 2026 hunt pages.
4. **Not used:** the winner and applicant name lists (`/static/license/huntlicense/pdfs/winter2026results/winter-2026-draw-{winners,applicants}.pdf`). They cover the newer 2026 drawing, but they list people, not application entries. When I counted the 2025 lists, the totals did not match the official table (DS102: 709 names against 4,324 applications). So these lists can't be used to rebuild the drawing numbers. ADF&G will publish 2026 drawing numbers in the 2027-2028 supplement, which is expected around Nov. 1, 2026.

### How fields were derived
- `tags` = Permits Available and `applicants` = Apps Received. Both are totals across residents and nonresidents, because **ADF&G does not split them by residency**.
- "Apps Received" counts application entries, not people. One person can enter the same hunt up to 6 times, and a party application is one entry for two hunters.
- `successPct` = permits ÷ applications × 100, rounded to 0.1 and capped at 100. It is null when no one applied (for example DM819 and DM823 had 0 and 1 applications). This is the same number ADF&G prints as "% Drawn", just less rounded.
- `draw.resident` and `draw.nonresident`:
  - If only one residency can apply, that side holds the full numbers and the other side is `null`.
  - If both can apply, both sides hold the same overall `successPct`, with `tags` and `applicants` set to null. Residents and nonresidents draw from one pool for each hunt.
  - Some hunts limit nonresident permits. For example, the DS102 Tok Management Area gives "10% of permits ... to nonresidents". On those hunts, nonresident odds can be lower than the shared rate.
- `weapon`:
  - `archery` (16 hunts): DE318, DM424/426/427/428/430, DM444, DM448, DM786/788, DM920/922, DS140/141/240/241.
  - `muzzleloader` (5 hunts): DM421/422/423, DM766, DM789.
  - Left out (6 hunts), because the weapon rule is mixed. The label explains each one:
    - DM466 and DM467: muzzleloader or shotgun.
    - DM783: muzzleloader, crossbow or bow.
    - DI403: weapons restrictions plus a required orientation.
    - DM996 and DX112: bow only inside the part of the area in the Dalton Highway Corridor.
  - Everything else is `any`, meaning no weapon restriction is listed.
- `unit`: the first GMU or subunit listed, in ADF&G's spelling ("13A", "20D", "14C", "7", "11"). `units[]` lists every unit when there are several.
  - "14(C)" is written as "14C", and "08" as "8".
  - "21CD and 24CD" (Koyukuk CUA) becomes 21C, 21D, 24C, 24D.
  - DM250 is listed as "11Z" in a 2026 page field, but its hunt area is "Game Management Unit 11", so it is stored as "11".
  - Every unit value appears in the GMU layer's `SubLabel` field (checked).
- `label`: species (legal animal) — Unit(s), area [who can apply; youth; weapon; guide rule]. The legal animal is from the 2026 hunt page. It can differ slightly from 2025.
- Species keys:
  - DM and YM → MOOSE
  - DC and YC → CARIBOU
  - DS → DALLSHEEP
  - DG → MTNGOAT
  - DI → BISON
  - DX → MUSKOX
  - DE → ELK
- **There are no deer (DEER) drawing hunts** in the 2025 results. Sitka black-tailed deer are hunted under general season and registration hunts. **Seasons are not included**, because the dates on the 2026 hunt pages are for the 2026 hunts.

Rows: MOOSE 105, DALLSHEEP 44, MTNGOAT 40, ELK 13, CARIBOU 9, BISON 4, MUSKOX 4. Total 219.

### Spot checks (JSON compared with the source)
| Hunt | Source row (p. 20 table) | ak.json | Unit / who can apply (hunt page) |
|---|---|---|---|
| DS102 | 4324 apps, 10 permits, <1% | 4324 / 10 / 0.2% | "12, 13C, and 20D, Tok Management Area"; residents and nonresidents |
| DC827 | 15550 / 149 / 1% | 15550 / 149 / 1.0% resident-only | "20A, Central Alaska Range"; "Alaska residents only" (2025 supplement: "Residents Only") |
| DM612 | 585 / 100 / 17% | 585 / 100 / 17.1% resident-only | 2025 supplement: "18, Zone 1 Residents Only … Antlerless" |
| DI403 | 33276 / 30 / <1% | 33276 / 30 / 0.1% | 2025 supplement: "20D, Delta … Bull" |
| DM682 | 24 / 6 / 25% | 24 / 6 / 25.0% nonresident-only, guided | "19C, Farewell"; "MUST use an Alaska-licensed guide" |
| DE713 | 1121 / 120 / 11% | 1121 / 120 / 10.7% | "08, SW Afognak Island"; both |
| DX112 | 10063 / 4 / <1% | 10063 / 4 / 0.0% | "26B, East of the Dalton Hwy"; resident-only |
| DM839 | 75 / 18 / 24% | 75 / 18 / 24.0% | "21E - Middle Yukon"; nonresident guided |
| DM335 | 381 / 15 / 4% | 381 / 15 / 3.9% nonresident-only | "Unit 13A"; 2025 supplement "13A Nonresidents Only DM335" |

## DRAWING RULES (verified)

- **Random draw, no points.** From the ADF&G Drawing FAQ (https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawfaqs): "Alaska uses a random drawing process … names are selected randomly". The drawing "does not use information about those that were drawn in previous years". A computer gives "a 'draw number' to each hunt on each valid application", and permits go to the lowest numbers. A party of two shares one draw number.
- **Application period and deadline.** Applications are online only, from Nov. 1 (8 am) to **Dec. 15, 5 pm AKST** (https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.drawsupplements: "Nov. 1, 8am – Dec. 15, 5pm AKST"). The 2025-2026 supplement had a Dec. 16, 2024 deadline. Results come out on the third Friday of February ("Drawing results will be announced on the third Friday of February", 2026-27 supplement p.1).
- **Fees.** On top of a hunting license: "$5 for each hunt number entry … in brown bear, black bear, caribou, elk, mountain goat, moose, or sheep hunts. It is $10 for each hunt number in bison and muskox hunts" (Drawing FAQ). There are no refunds. You need an Alaska big-game hunting license, or must have applied for one, before you apply. Residents aged 17 and under are exempt.
- **How many applications.** "Applicants may submit up to six applications (individual or party) per species" (supplement p.1 and FAQ). You may enter the same hunt more than once. If you go over six, all your applications for that species are rejected. Exceptions:
  - Koyukuk CUA moose: a guided nonresident gets 1 application, and anyone who got a KCUA permit last year can't get one this year.
  - 21E moose: DM837 **or** DM839, not both.
  - 19C Farewell moose: DM681 **or** DM682, not both.
- **Other rules.**
  - You can get at most one drawing permit per species per regulatory year.
  - You can't win the exact same hunt two years in a row (example given: DS102), except undersubscribed permits.
  - Hunters must be 10 or older.
  - Youth hunts (code starts with "Y") are for ages 10-17.
  - Permits aren't transferable.
  - Undersubscribed hunts are posted the first Friday in March.
- **Resident-only hunts.** Yes. Of the 211 hunt pages I fetched, 82 say "Alaska residents only", 41 say "Nonresidents only" and 88 are open to both. The supplement marks hunts "Residents Only" or "Nonresidents Only". Some hunts are split by nonresident guide type: "Nonresidents Guided Only", "Nonresidents guided by resident relative Only", and nonguided-only (for example DC826 and DM681, where you "may NOT use an Alaska-licensed guide").
- **Nonresident limits.** There is no statewide nonresident quota in the supplement or FAQ. Limits are set hunt by hunt: hunt pages list "Up to N permits" for Nonresidents and Alaska residents, and some hunts are nonresident-only or resident-only. One example (DS102 Tok Management Area, 2026-27 supplement): "10% of permits are allocated to nonresidents. A maximum of 50% of nonresident permits may be allocated to nonresidents accompanied by a resident relative."

### Nonresident guide requirement
- Supplement p.1 says nonresident U.S. citizens must be "personally accompanied in the field by an Alaska-licensed guide OR an Alaska resident relative 19 years of age or older within the second-degree of kindred" when hunting **brown/grizzly bear, Dall sheep, or mountain goat**.
- Nonresident aliens need a licensed guide for **all** big game.
- Second-degree of kindred means father, mother, brother, sister, son, daughter, spouse, grandparent, grandchild, brother- or sister-in-law, son- or daughter-in-law, father- or mother-in-law, or step-relatives (stepfather, stepmother, stepsister, stepbrother, stepson, stepdaughter).
- The 2026-2027 regulations (p.10) add that the guide or relative "must be within 100 yards of the nonresident when they attempt to take game".
- Guided hunts need a signed guide-client contract "before or at the time of application", and the guide's Unique Verification Code goes on the application.
- Sources: https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.guiding and https://www.adfg.alaska.gov/static/regulations/wildliferegulations/pdfs/regulations_complete.pdf

### Tier I / Tier II and registration permits (not included as draw rows)
- **Tier I and Tier II** (https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.tier): "Tier I & II subsistence permits are available to Alaska residents only."
  - Tier I: every applicant who wants one gets a permit.
  - Tier II: used when not every eligible resident can be given a fair chance. "Applications are scored" to decide who gets the limited permits. That makes it a scored allocation, not a random drawing.
  - Applications run Nov. 1 – Dec. 15. Paper applications must be postmarked by Nov. 30.
  - Results are separate: https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.tierresults
- **Registration permits** (https://www.adfg.alaska.gov/index.cfm?adfg=huntlicense.registration): "Most registration hunts are available for both residents and nonresidents."
  - There is usually no cap on permits. The season is closed by emergency order once the harvest goal is met. A few are first-come, first-served.
  - You get them in person, by mail or online before each hunt.
- **Community Subsistence Harvest** (CM300) is also resident-only.
- None of these hunts (T…, R…, C… codes) appear in the drawing results table, so none are in ak.json.

## Post-hunt reporting
- **Harvest tickets (general season)** (2026-27 regulations, p.14): the harvest report "must be completed and returned within 15 days of taking the bag limit, or within 15 days after the close of the season, even if you did not hunt". Every harvest ticket needs a report.
- **Drawing, registration and Tier permits** (regulations, p.15): "All permit holders must complete the permit report", including those who did not hunt, within the time printed on the permit. For example, the DS102 hunt page says "Report within 15 days of kill" and "Report by mail within 15 days of season end". Online reporting is at hunt.alaska.gov.
- **What happens if you don't report:**
  - Regulations: "If you fail to report, you will be ineligible for any permits the following regulatory year, and you may be cited". The report form adds that failing to report "is a misdemeanor".
  - Supplement p.1: "If you fail to report on a Drawing, Registration (including Tier I, Nelchina caribou), Targeted, or Tier II permit … you will be ineligible to receive any permits for the next regulatory year, including all Drawing hunts".
- **Sheep sealing** (regulations, p.33, "Ram horn sealing requirements"):
  - Horns "must be permanently sealed prior to exporting from Alaska". The horns and the harvest or permit report go to ADF&G "within 30 days of the date of kill, or sooner if permit or harvest ticket requires".
  - Horns must be attached to the skull plate.
  - Horns may not be altered before sealing, and must come out of the field with the meat.
  - The permit hunt pages also require "Horns attached to skull plate. Must be sealed by ADF&G". The 14C sheep hunts require bringing horns and the report in within 10 days.

## GMU boundary layer (ADF&G official, public)
- ADF&G's GIS page (https://www.adfg.alaska.gov/index.cfm?adfg=maps.hunting_gis) links the shapefile "AK Game Mgmt Units (eff 7/1/2025)" (ArcGIS item f1019b8731aa4ec4921501d035c7ba5e, owner alaskafishandgame). The live REST service is on ADF&G's own server:
- **Layer:** `https://gis.adfg.alaska.gov/ags/rest/services/wc_public/GMUSubunits/FeatureServer/4` ("Game Management Subunits (< 1:4m)").
  - Layer 3 is the 1:4m–8m generalized version.
  - Layer 2 is the Regions layer.
  - A MapServer exists with the same layers.
- **Field to match `unit` on: `SubLabel`** (string, max 3 characters). It uses ADF&G's spelling: "13A", "14C", "20D", and plain numbers for units with no subunits ("7", "11", "18", "23").
  - `UnitSub` is a zero-padded code with "Z" for undivided units ("07Z", "11Z", "13A").
  - `SubLetter` holds the letter alone ("A"…, or "Z").
  - Other fields: Region, SqMi, OBJECTID.
- There are 73 features, one per subunit or undivided unit. A whole unit that has subunits (such as "13") has **no single polygon**, so you need to combine 13A–13E.
- Native spatial reference is Alaska Albers (WKID 102006 / 3338), so request `outSR=4326`.
- Tested 2026-10-07:

```
curl "https://gis.adfg.alaska.gov/ags/rest/services/wc_public/GMUSubunits/FeatureServer/4/query?where=SubLabel%3D%2713A%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 Polygon: SubLabel "13A", UnitSub "13A", Region 4, SqMi 4441
curl ".../FeatureServer/4/query?where=SubLabel%3D%277%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ 1 Polygon: SubLabel "7", UnitSub "07Z"
```

- Hunt-area boundaries (smaller than a subunit) are **not** downloadable. The GIS page says "We currently do not offer downloadable data for hunt area boundaries". There are only PDF maps per hunt.

## Uncertainties
- The data is one draw cycle old (2025). The 2026 drawing numbers aren't published yet.
- There are no applicant counts by residency. For hunts open to both, the per-residency rate is the shared overall rate.
- Units, labels and who can apply come from the 2026 hunt pages. They are applied to 2025 numbers on the assumption the hunts didn't change. I spot-checked 10 hunts against the 2025 supplement and all matched.
- DS150 and DS206 show "Residents Only / Nonresidents Only" sub-rows in the supplement. I read these as different legal animals for each residency inside one hunt that both can apply for, which is what the 2026 pages show.
- DG856 (2025-only) has no legal-animal text, and its "open to both" status is inferred because the supplement shows no residency label.
- The guide notes in labels cover only the hunts where the 2025 supplement text says so explicitly. Other nonresident-only sheep and goat hunts still fall under the general guide-or-relative rule.
