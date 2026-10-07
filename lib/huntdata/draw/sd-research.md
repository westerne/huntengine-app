# South Dakota (GFP) — draw rules, data sources and hunting-unit map

Checked 2026-10-07 against South Dakota Game, Fish and Parks (GFP) sources only: gfp.sd.gov, its PDFs, and GFP's own licensing system (Go Outdoors South Dakota, `license.gooutdoorssouthdakota.com`). gfp.sd.gov links to that system for draw statistics. No third-party sites were used.

## DRAW RULES (2026 cycle)

South Dakota runs a **random draw in preference pools, with cubed preference points**. It is not a top-down point system. Within a pool, each application gets one entry for this year plus one per year of preference. For a group, the lowest point total in the group counts. GFP then cubes the number of entries [1]:

> "GFP will cube the number of times a person's name is in the draw before the draw is run." … "This does not change the drawing to a true top down preference point system." [1]

- **Pools for deer, antelope (and turkey)** [1]. Half the licenses go to the landowner pools first. "50% of all licenses available in a unit are offered to those who qualify for landowner status and have preference." Next come landowners without points. Then the 2+ preference pool gets 50% plus any licenses left from the landowner pools. The 1+ pool comes next, then the 0+ pool. GFP: "No licenses will be issued to an applicant in the 0+ Preference Pool unless all applicants in the 1+ Preference Pool have been issued a license." Second choices are drawn only after all first choices.
- **Pools for elk (Black Hills rifle and archery, Prairie)** [1]: landowner 50%, then 10+ points 30%, then 2+ points 15%, then 0+ points 5%. Unsuccessful applicants drop to the next pool. **Custer State Park elk**: 15+ points 34%, 10+ points 33%, 0+ points 33%. The draw-statistics pools show sheep using 10+/2+/0+ pools.
- **Getting points.** For deer and antelope you must *buy* a point: "Preference points are not awarded automatically if unsuccessful" [2]. You buy one either by opting in on the application or from Sept 15 to Dec 15. Points cost $5 for residents and $20 for nonresidents [2]. "For elk, mountain goat, and bighorn sheep, an applicant shall receive a single preference point per year and season, if unsuccessful" [2]. "Preference point use is required for the first choice of the first draw … optional in subsequent draws" [2].
- **Limits and waiting periods.** Bighorn sheep is once in a lifetime: "All bighorn sheep seasons and units are considered a once-in-a-lifetime opportunity" [4]. For elk, if you draw using points you lose them, and you can't apply in the first draw for that season for nine years. "Previous recipients of a Custer State Park Early Archery or Custer State Park Firearms Elk license are ineligible to apply for those seasons again" [3]. "Only ONE elk license is allowed per individual per year" [3].
- **Draw rounds.** Combined deer has first through fourth draws, then first-come leftovers. In the first draw, residents may apply for 2 of the 6 firearm deer seasons. Nonresidents may apply for 2 of 3 seasons: West River, Black Hills and Refuge [2]. Antelope has a first and second draw, then leftovers. Elk has a first and a second draw ("if needed") [3]. Sheep has one draw [4].
- **Nonresidents.**
  - Elk is resident-only: "Only South Dakota residents are eligible to apply for and receive an elk license in South Dakota" [5].
  - Bighorn sheep is resident-only: "South Dakota residents who have never received a license for any South Dakota bighorn sheep season are eligible to apply" [4].
  - East River deer: "All license numbers listed are for Residents only. No licenses are available to nonresidents until the leftover period" [6].
  - "Nonresidents may not apply for any East River, Muzzleloader, or Custer State Park season" [2]. East River Special Buck is resident-only [2].
  - Nonresidents may apply for West River deer, Black Hills deer, Refuge deer, West River Special Buck (500 nonresident licenses), Prairie antelope, and the nonresident archery deer and antelope draws.
  - I found **no published percentage cap** for nonresidents. The quota tables only list resident and nonresident numbers per license. Those happen to be about 8% for West River deer (02A-01: 400 resident / 32 nonresident) and about 2% for antelope (27A-42: 350 / 7). These ratios are derived, not a quoted rule.
- **Application windows for 2026.** All close at 8:00 a.m. Central. Dates are from the 2026 application PDFs:
  - Special Buck: Mar 11 – Apr 14 [7]
  - Elk: first draw Apr 15 – May 19, second draw May 28 – Jun 11 [3]
  - Bighorn sheep: Apr 15 – May 19 [4]
  - Nonresident archery deer: May 13 – Jun 9 [8]
  - West River, East River, Black Hills, Custer State Park, Muzzleloader and Refuge deer: first draw May 27 – Jun 23; later draws Jul 8–22, Jul 29 – Aug 12, Aug 18 – Sep 1 [6]
  - Firearms and nonresident archery antelope: Jun 16 – Jul 7; second draw Jul 9–23 [9][10]
  - In short: spring (March–May) for special buck, elk and sheep; May–June for deer; June–July for antelope.
  - GFP's "Key Dates" feed (`POST https://gfp.sd.gov/Data/GetSeasonsKey`) shows slightly different opening dates for some seasons, for example deer Jun 3 – Jun 23 and elk Apr 22 – May 19. The closing dates match.

Nonresident eligibility by species: DEER yes, for some seasons only. ANTELOPE yes (Prairie firearms, nonresident archery, Special Antelope). ELK no. BIGHORNSHEEP no. MTNGOAT: season closed.

Sources:
1. Preference Points — https://gfp.sd.gov/preference-points/ ("Cubed Preference Points", "Drawing Procedure for Deer, Antelope and Turkey", "Drawing Procedure for Elk")
2. Hunt & Fish Licenses (application requirements, preference point and application fees, Combined Deer, Antelope) — https://gfp.sd.gov/hunt-fish-license/
3. 2026 Elk application info — https://gfp.sd.gov/userdocs/docs/2026elk.pdf
4. 2026 Bighorn Sheep — https://gfp.sd.gov/userdocs/docs/2026bhsheep.pdf
5. Elk page — https://gfp.sd.gov/elk/
6. 2026 combined deer application (West River, East River, Black Hills, CSP, Muzzleloader, Refuge) — https://gfp.sd.gov/userdocs/docs/combined-deer-app.pdf
7. 2026 Special Buck — https://gfp.sd.gov/userdocs/docs/2026specialbuck-app.pdf
8. 2026 Nonresident Archery Deer — https://gfp.sd.gov/userdocs/docs/nonresident-archery-deer-app.pdf
9. 2026 Firearms Antelope — https://gfp.sd.gov/userdocs/docs/firearmsantelope.pdf
10. 2026 Archery Antelope — https://gfp.sd.gov/userdocs/docs/archeryantelope.pdf
11. Mountain goat page ("The mountain goat hunting season is closed") — https://gfp.sd.gov/mountain-goat/

## Data used in draw/sd.json (2026)

**Source.** https://gfp.sd.gov/draw-stats/ links to GFP's Draw Statistics tool at https://license.gooutdoorssouthdakota.com/License/DrawStatistics. The page fills its dropdowns from `POST /License/DrawStatistics/FilterDropdowns` with Year, PhaseCategoryID and PhaseID. For each license (EventID), it returns two HTML tables:
- `POST /License/DrawStatistics/GetDrawResults`: for each pool, licenses available, eligible applicants, licenses issued and remaining.
- `POST /License/DrawStatistics/GetDrawPreferences`: for each preference-point level, eligible and successful applicants, split into Landowner / Resident Non Landowner / Non Resident.

I fetched all 2026 deer, elk, antelope and sheep licenses: 397 phase×license pages. Only the **First Application Period** is used, which gives 285 rows. Every 2026 license appears in the first period.

**How each field was derived:**
- `huntCode` = `<prefix>-<GFP code>`.
  - Prefixes that GFP itself prints: AEE, BHE, PRE, CEE, CUE, CAE, BHS, CBS, BHD, CUD, ESD, WSD, ADNP, ARNP.
  - Prefixes I made up for uniqueness: WRD, ERD, MZD, NWR, ERNL, APD, APA, PRA, CUA. (WRD appears in GFP's harvest service field names.)
  - The prefix is needed because some GFP codes repeat across seasons. For example, H1A21 is used for both archery and firearm elk, and ST102 for both muzzleloader and nonresident archery deer.
- `unit` = the GFP code minus its 2-digit license type. Examples: `02A01` → `02A`, `H2B23` → `H2B`, `BH252` → `BH2`, `CU121` → `CU1`, `CAE-CU1` → `CU1`, `ST102` → `ST1` (statewide).
  - GFP itself calls elk license areas units, e.g. "Unit BHE-H5A" in the 2026 elk PDF.
  - A type with a P suffix (03P/13P/19P) means "valid on private land only" [6].
- `draw.<residency>.tags` = sum of "Licenses Issued" over that residency's first-choice pools, plus the "Remaining Licenses" of the last pool. Second-choice rows are excluded.
- `applicants` = first-choice applicants: the Preference Breakdown totals. For residents this is Landowner plus Resident Non Landowner.
- `successPct` = first-choice successful ÷ applicants × 100. I computed it; GFP prints no percentage.
- `pools` give landowner vs non-landowner residents, where a landowner pool exists. Pool tags are null.
- `pointLines` = the Preference Breakdown rows: resident non-landowner (or "Resident"), and nonresident. Levels with 0 applicants are dropped.
- `nonresident` is null when GFP shows no nonresident pool, or one with 0 licenses and 0 applicants.

**Automatic checks on every row** (all passed): the point-level rows sum to the printed totals, and the first-choice successful count equals the licenses issued across the pools.

**Not included:**
- Municipal Archery Deer (city management hunts)
- Returned Deer re-issue phase
- Second through fourth draws and leftovers
- Turkey, bison, lion, paddlefish
- Special Antelope: no 2026 statistics are posted; the latest is 2025
- Mountain goat: closed; last draw statistics are from 2022

Record counts: DEER 195, ELK 56, ANTELOPE 31, BIGHORNSHEEP 3, MTNGOAT 0.

## Data used in harvest/sd.json (2025 seasons; sheep 2024)

Rows are **per license (unit + license type)**. They come from the GFP "Harvest Reports and Surveys" page https://gfp.sd.gov/hunt-surveys/, whose PDFs are at `https://gfp.sd.gov/images/Harvest_Reports/<NAME>.pdf`:
- WEST RIVER PRAIRIE FIREARM DEER
- EAST RIVER FIREARM DEER
- BLACK HILLS DEER
- CUSTER STATE PARK DEER
- MUZZLELOADER DEER
- NATIONAL WILDLIFE REFUGE FIREARM DEER
- ARCHERY DEER
- BLACK HILLS CSP PRAIRIE ELK
- FIREARM ANTELOPE
- CUSTER STATE PARK ANTELOPE
- ARCHERY ANTELOPE
- SPECIAL ANTELOPE

The tables were read with pdfplumber, by character position.

**How each field was derived:**
- `successPct` = GFP's "Hunter Success" column. When a report prints only "Tag Success" (single-tag licenses), that figure is used.
- `harvest` = GFP's "Total Harvest" / "Harvested" projection.
- `hunters` is null, because GFP prints licenses sold and survey response rate, not hunters afield.
- Row sums match the report totals within rounding.

**Sheep.** Bighorn sheep figures are for the 2024 season, from *South Dakota Game Report 2025-07, 2024 Big Game Harvest Projections*: https://gfp.sd.gov/userdocs/docs/2024_big_game_annual_report.pdf. Black Hills BH2 and BH4 are reported together, so the row uses unit `BH`.

**Left out:**
- Unlimited and landowner-own-land licenses
- Resident archery, which is over the counter
- Access-permit archery
- Three rows with a blank Hunter Success cell: 58D-13, 67A-11, and archery H5A-21

263 of 277 harvest rows match a 2026 draw huntCode. The rest are license types that changed between 2025 and 2026, plus Special Antelope and the combined Black Hills sheep row.

Record counts: DEER 188, ELK 56, ANTELOPE 31, BIGHORNSHEEP 2.

## Spot checks (source value → file value)

Draw (2026):
1. **WRD-02A01** (West River 02A any deer). Draw Results: resident pools issued 2+36+55+164+143 = 400, nonresident 32. Preference Breakdown: Landowner 38/38, Resident Non Landowner 487/362, Non Resident 134/32. The 2026 deer PDF quota table also shows 02A type 01 = 400 resident / 32 nonresident. File: resident tags 400, applicants 525, 76.2%; nonresident tags 32, applicants 134, 23.9%. ✓
2. **BHS-BH252** (Black Hills sheep BH2). Three pools issued 1+1+1. Breakdown total 2,396 applicants, 3 successful. The 2026 sheep PDF says "BHS - BH2 52 3". File: tags 3, applicants 2,396. ✓
3. **CUE-CU121** (Custer State Park firearm elk). Pools 12+12+11 = 35. The 2026 elk PDF says "CUE 21 35". Breakdown total 11,887 applicants. ✓
4. **PRA-27A42** (Fall River / SW Custer antelope). The 2026 firearms antelope PDF says "27A … 42 350 7". File: resident tags 350, nonresident 7 (301 applicants, 2.3%). ✓
5. **MZD-ST102** (Muzzleloader any buck). Resident 2+ pool: 1,000 available and issued. Breakdown 3,999 applicants, 1,000 successful. The deer PDF says "ST1 Statewide 02 1000". File: 1000 / 3999 / 25.0%. ✓
6. **BHE-H2A21**. The elk PDF quota is H2A type 21 = 400. File tags 400; applicants 10,460 (landowner 31 + non-landowner 10,429). ✓

Harvest (2025, the PDF row → file):
1. WRD-15A18: 554 harvest, Hunter Success 62% → 554 / 62 ✓
2. ERD-01A01: 160 harvest, 40% → 160 / 40 ✓
3. BHD-BH102: 142 harvested, 62% → ✓
4. AEE-H2A21 (archery elk): 69 harvested, 56% → ✓
5. CUE-CU121 (Custer State Park firearm elk): 22 harvested, 89% → ✓
6. PRA-02A42: 33 harvest, 66% → ✓
7. WSD-WR101 (West River special buck): 739, 74% → ✓

## Hunt-unit boundaries (ArcGIS)

**No publicly queryable official layer was found.**

GFP's hunting-unit maps are on https://gfp.sd.gov/maps/. Its Web Experiences are owned by the GFP account Hannah.Mielitz, for example Deer = `eab1f1f8a7c34cd89b9777c6e786f08b` and Elk = `bfdaf6908845480a88781302af47505b`. Their layers come from ArcGIS Online proxy services:

- Deer: `https://utility.arcgis.com/usrsvcs/servers/3fc40e83d2d54a37be8623ccec30e317/rest/services/Hunting/HuntUnit_Deer/MapServer` (item "Hunt Unit Deer - Public")
- Elk: `https://utility.arcgis.com/usrsvcs/servers/c0fca3a52a4c4759a1aaaa20cefd649b/rest/services/Hunting/HuntUnit_Elk/MapServer`
- Antelope, sheep and goat: `https://utility.arcgis.com/usrsvcs/servers/e540e4433c314a218bf30fd1d42b5ea8/rest/services/Hunting/HuntUnit_Antelope_Sheep_Goat/MapServer`

Tests run 2026-10-07:
- `curl "<deer>/MapServer?f=json"` and `curl "<deer>/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=false&f=json"` returned `{"error":{"code":403,"messageCode":"GWM_0003","message":"You do not have permissions to access this resource…"}}`.
- The underlying server `https://sdgis.sd.gov/gfp/rest/services/<folder>` returns "Token Required" (499).

I did not try to get around these limits, for example by faking a Referer header. The only public GFP-hosted layer is `https://services.arcgis.com/jWPBXspaQsJStWX8/arcgis/rest/services/Deer_Archery_Muzzle_Boundaries/FeatureServer/9`. Its field is `Label`, with values ST1, WR1 and ER1, which are archery/muzzleloader areas. It is not deer units.

If GFP shares a public layer later, the field name should be checked against the unit spelling used here (`02A`, `H2A`, `BH2`, and so on).

## Post-hunt harvest reporting

- **No general mandatory harvest report for deer, elk or antelope was found.** GFP estimates harvest from emailed surveys: "Surveys are emailed at the end of each hunting season to all hunters with a working email address." It follows up with two reminder emails (https://gfp.sd.gov/hunt-surveys/). The 2026 big game regulations (https://gfp.sd.gov/userdocs/docs/2026biggameregs.pdf) and the 2026 application PDFs contain no reporting deadline or penalty.
- **Bighorn sheep — mandatory inspection.** "Successful hunters must have their bighorn sheep inspected and legally marked (plugged) by a GFP representative within 24 hours of kill." License holders "must attend an in-person orientation meeting" [4]. No specific penalty is stated in that document.
- Historical note from the elk harvest report: "Prior to 2002 … the mandatory check in" was used for elk. That is not a current rule.
- Out of scope: municipal deer hunters must report harvest to the Sioux Falls office (https://gfp.sd.gov/municipal-deer/), and mountain lion uses mandatory check-in (2024 annual report).

## Uncertain / open

- Nonresident allocation is shown per license in GFP's quota tables. I found no quoted percentage rule.
- The Key Dates API and the application PDFs disagree on some opening dates. This file uses the PDF dates.
- Draw statistics come from GFP's licensing domain (`license.gooutdoorssouthdakota.com`), not `gfp.sd.gov` itself. GFP links to it as its "Draw Statistics" page.
- Harvest figures are survey projections. Pre-2026 license codes may not match 2026 draws exactly.
- Mountain goat is excluded because the season is closed.
