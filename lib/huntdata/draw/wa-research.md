# Washington (WDFW) — draw rules, data sources and hunt-unit map

Researched 2026-10-07 from Washington Department of Fish and Wildlife sources only (wdfw.wa.gov, its PDFs, and WDFW's own ArcGIS server at geodataservices.wdfw.wa.gov). No browser was used. Nothing was blocked.

## DRAW RULES

Washington runs one **weighted-point** special hunt permit draw for deer, elk, mountain goat, bighorn sheep, moose and fall turkey.

- **Weighted (squared) points.** The 2026 pamphlet says: "A weighted-point permit drawing system is used. Applicants who have not been selected in the past have a better chance of being awarded a permit, based on their application history." [1, p. 18]. The squaring comes from a WDFW issue paper: points "are squared and represent the number of 'names in the hat' each hunter has for a drawing" [2]. The 2026 pamphlet does not say "squared". The squared rule is WDFW's own description, but it's from 2021.
- **Points.** "Points accumulate within each species category. Each application earns one point. When selected, a hunter's points for that category resets to zero. Points cannot be transferred between individuals or categories." [1, p. 18]. If you buy an application and don't submit it, you get one point. A "Point Saver" option lets you build points without being drawn [1, p. 19]. If you return a permit at least two weeks before the season opens, your points are restored [1, p. 18].
- **Choices.** "You can apply for a maximum of four hunt choices per application, except in the quality deer and elk categories. For quality deer and elk hunts only two hunt choices are allowed." [1, p. 18]. You buy one application per category, for example Quality Elk, Bull Elk, Antlerless Elk, Elk Youth / 65+ / Disabled / Master Hunter, Goat, Antlered Bull Moose, or Sheep Any Ram. Groups can have up to 8 hunters for deer and elk and up to 2 for goat, moose and sheep. Group points are averaged [1, p. 18-19].
- **Once in a lifetime (in effect).** For Goat, Antlered Bull Moose Only and Sheep Any Ram: "If a hunter reports taking a [goat/moose/sheep] on one of these hunts, or fails to report their hunting activity, no further special hunt applications for [category] can be purchased." [1, p. 20]
- **Residency.** Nonresidents apply in the same draw and pay more per application: Special Hunt Permit Application is $9.61 for residents and $152.30 for nonresidents. Quality applications are $18.72 for residents and $152.30 for nonresidents [1, p. 8]. I found no separate nonresident quota or pool in the 2026 pamphlet, and WDFW publishes no residency split in its results. **Not confirmed with a direct WDFW quote saying there is no nonresident cap.**
- **Application window and deadline month: MAY.** 2026: "April 20 through midnight on May 20, 2026" [1, p. 18]. WDFW then extended it: "WDFW has extended the deadline for special hunt permit application submissions until May 27" [3]. 2025: the pamphlet cover gave the deadline as May 28, 2025 [4]. Results: "Results for deer, elk, mountain goat, bighorn sheep, moose, and turkey will be available by the end of June." [1, p. 19]
- 2024 note: the 2024 draw had a vendor software error. WDFW reallocated choices after the draw: 723 applicants were added and 738 who were wrongly drawn were handled by hand [5]. The 2025 numbers used here don't have this problem as far as I know.

Sources:
1. *2026 Big Game Hunting Seasons and Regulations* (effective Apr 1 2026–Mar 31 2027) — https://wdfw.wa.gov/sites/default/files/publications/02706/wdfw02706.pdf (publication page https://wdfw.wa.gov/publications/02706)
2. WDFW, *Special Hunt Points* issue paper (2021-06) — https://wdfw.wa.gov/sites/default/files/2021-06/1_ada_points_issue_paper.pdf
3. News release, Apr 13 2026 (updated May 14 2026) — https://wdfw.wa.gov/newsroom/news-release/2026-washington-big-game-hunting-regulations-now-available-special-hunt-submissions-begin-april-20
4. *2025 Big Game Hunting Regulations* — https://wdfw.wa.gov/sites/default/files/publications/02608/wdfw02608.pdf
5. 2024 Special Hunt Permit Draw Updates — https://wdfw.wa.gov/hunting/special-hunts/2024-draw-updates

## DATA USED

### draw/wa.json (2025 draw, 843 hunts)

- **Applicants and permits:** WDFW's 2025 game-harvest "Individual hunts" pages. Each special permit hunt is one table with "Total Applicants" and "Permits Issued". Moose, goat and sheep tables also have "Quota".
  - https://wdfw.wa.gov/hunting/management/game-harvest/2025/deer-individual (467 hunts)
  - https://wdfw.wa.gov/hunting/management/game-harvest/2025/elk-individual (331)
  - https://wdfw.wa.gov/hunting/management/game-harvest/2025/moose (28)
  - https://wdfw.wa.gov/hunting/management/game-harvest/2025/bighorn-sheep (12)
  - https://wdfw.wa.gov/hunting/management/game-harvest/2025/mountain-goat (5; WDFW offered only 5 goat hunts in 2025)
- **GMU(s), weapon, legal animal, category, dates:** 2025 pamphlet special permit tables [4], read with `pdftotext -table`. I joined them to the harvest pages on the 2025 hunt choice number. The hunt names matched on every joined row. Pamphlet "PERMITS" equaled "Permits Issued" for 750 of 843 hunts. The rest had fewer permits issued, mostly undersubscribed second-deer hunts.
- **Fields:**
  - `tags` = Permits Issued. `applicants` = Total Applicants.
  - `successPct` = issued ÷ applicants × 100, rounded to 0.1, or to 0.01 when under 1%.
  - The same combined stat goes in both `resident` and `nonresident`, because it's one pool.
  - `pointLines` and `minPoints` are left out. WDFW publishes no per-hunt point tables.
- **Units:**
  - `unit` = the first GMU as a 3-digit string, or the agency's area name ("Elk Area 1015", "Deer Area 4541", "Region 1", "Centralia Mine", "Blackrock Ranches", "Silver Dollar", "Buckrun").
  - Moose use GMUs.
  - Sheep use "Sheep Unit N", except Wenaha (GMU 169).
  - Goats use goat-unit codes ("3-6").
  - Hunt 1200 Palouse says "GMUs 127-142", so I stored only 127. I did not guess the member GMUs.
- **Weapon:** Modern, EF or WF → rifle. EA or WA → archery. EM or WM → muzzleloader. Several tag types, "Any", and all moose/goat/sheep → any.
- **Season:** set only for a single date range. Jan–Mar dates are in 2026. Split seasons appear only in the label.
- **Left out:** multi-season deer and elk tag drawings (1998, 1999, 2998, 2999, statewide), raffles, auctions, and incentive permits.

### harvest/wa.json (2025 season)

- **Per special-permit hunt (huntCode = 2025 hunt choice):** the same five pages above.
  - hunters = "Hunters". harvest = "Total Harvest". successPct = WDFW "Hunter Success" (whole %).
  - daysPerHarvest = "Days/Kill". Only moose, goat and sheep pages have it; it's null when nothing was harvested.
  - Hunts with 0 hunters are left out.
- **Per GMU × weapon, general (OTC) season, no huntCode:**
  - Sources: https://wdfw.wa.gov/hunting/management/game-harvest/2025/deer-general (539 rows) and https://wdfw.wa.gov/hunting/management/game-harvest/2025/elk-general (419 rows).
  - Methods: Archery, Modern Firearm, Muzzleloader, and Multiple Weapons (multi-season tags → `any`). District totals and 0-hunter rows are left out.
- **OTC:** `DrawRow` has no `otc` field, so general-season opportunity is represented only by these harvest rows. **Recommend `UNIT_FALLBACK.WA = false`.** General rows cover all general-season hunters, not a special permit.
- WDFW says these are "annual hunting and trapping statistics based on hunter reporting" and "Harvest estimates are … subject to change" (https://wdfw.wa.gov/hunting/management/game-harvest).

## SPOT CHECKS (source page vs file, 2026-10-07)

| Hunt | Source (applicants / issued / hunters / harvest / success) | File |
|---|---|---|
| 1000 Kelly Hill White-tailed Buck (deer-individual) | 75 / 5 / 4 / 1 / 25% | unit 105, rifle, 5/75 = 6.7%, harvest 4 hunters, 1, 25 ✓ |
| 1201 Blue Mtns. Foothills West | 2,492 / 60 / 26 / 19 / 73% | units 149,154,162,163,166 (pamphlet), 60/2492 = 2.4%, 26/19/73 ✓ |
| 2001 Prescott (elk-individual) | 188 / 5 / 2 / 1 / 50% | GMU 149, EF → rifle, 2.7%, 2/1/50 ✓ |
| 2844 White River | 1,077 / 10 / 4 / 3 / 75% | GMU 653, WM → muzzleloader, 0.93%, 4/3/75 ✓ |
| 8005 Selkirk 113 (moose) | 6,171 / quota 15 / 15 / hunters 12 / harvest 10 / 83%, days/kill 18 | GMU 113, 0.24%, 12/10/83, 18 ✓ |
| 6003 Mt. Margaret Backcountry (goat) | 4,667 / 2 / 2 / 2 / 100%, days/kill 4 | unit "5-6", 0.04%, 2/2/100, 4 ✓ |
| 5000 Cleman Mountain (sheep) | 7,454 / 4 / 4 / 4 / 100%, days/kill 2 | Sheep Unit 7, 0.05%, 4/4/100, 2 ✓ |
| Elk general GMU 105 Kelly Hill | Modern Firearm 149 hunters, 5 harvest, 3%, 207 days/kill | same ✓ |

## UNCERTAIN / NOT PUBLISHED

- **"Total Applicants" definition.** WDFW does not say whether it counts every applicant who listed the hunt at any choice, or only first choice. So `successPct` is a rough permits-per-applicant ratio, not a first-choice draw rate.
- **Two applicant counts disagree.** The 2026 pamphlet has a "2025 APPS/AVG POINTS" column. Its apps are 3–10% lower than "Total Applicants" (hunt 1000: 70 vs 75; 8000: 6,472 vs 6,719; 6000: 7,626 vs 7,763). The likely reason is applications vs. applicants, since group members each count, but that isn't confirmed. "AVG POINTS" isn't defined: it could be the average for applicants or for winners. That column is keyed to 2026 hunt numbers, so I didn't use it.
- **Old Power BI results.** WDFW's "Special hunt permit drawing result summaries" page (https://wdfw.wa.gov/hunting/special-hunts/results) embeds Power BI reports. They show per-hunt first- to fourth-choice selections and average winner points, but the page says "Data last updated June 21, 2021" and the dataset was last refreshed 2022-01-27. That's too old to use.
- **2026 draw.** Per-hunt 2026 statistics were not published yet.
- **Nonresident cap.** See Residency above: none found, but no WDFW quote rules one out.

## HUNT-UNIT MAP LAYERS (WDFW official, public ArcGIS MapServer)

- **GMUs:** `https://geodataservices.wdfw.wa.gov/arcgis/rest/services/MapServices/HOReferenceService/MapServer/0` ("Game Management Units (GMU)", In_Effect_Desc "April 1 2026 to March 31 2027").
  - Field **`GMU_Num`** is an **integer**, so query it unquoted. Also has GMU_Name and WDFWReg_Num. 162 features.
  - Every numeric GMU in draw/wa.json and harvest/wa.json exists in this layer (checked 2026-10-07).
  - A generalized copy is at `.../MapServices/SharedReferenceLayers/MapServer/0`.
- **Elk Areas:** `.../HOReferenceService/MapServer/5`, field `EA_ID` (int) + EA_Name. All Elk Area units in the file exist.
- **Deer Areas:** `.../HOReferenceService/MapServer/4`, field `DA_Id` (int) + DA_Name. All Deer Area units in the file exist.
- **Bighorn sheep units:** `.../SharedReferenceLayers/MapServer/1`, field `BSU_ID` (int).
- **Goat units:** `.../SharedReferenceLayers/MapServer/4`, field `MGU_Nu_Code` (string "3-6").
- **Moose areas:** `.../SharedReferenceLayers/MapServer/5`, field `MU_ID`.
- Don't use `WP_HuntPlanner/Regulation/MapServer/0` (UnitSpatial): its `UnitID` is an internal id, not the GMU number.

Working tests (2026-10-07):

```
curl "https://geodataservices.wdfw.wa.gov/arcgis/rest/services/MapServices/HOReferenceService/MapServer/0/query?where=GMU_Num%3D149&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 feature (Polygon), GMU_Num 149, GMU_Name "Prescott"
curl ".../HOReferenceService/MapServer/5/query?where=EA_ID%3D1015&outFields=EA_ID,EA_Name&returnGeometry=true&outSR=4326&f=geojson"
→ 1 feature (MultiPolygon), EA_ID 1015 "Turnbull"
```

## POST-HUNT HARVEST REPORTING (mandatory)

- **Who and what:** Mandatory for deer, elk, black bear, moose, bighorn sheep, mountain goat and turkey. That covers every tag bought and every special permit awarded, even if you didn't hunt.
- **Deadline:** **January 31**. If a special permit season runs past January 31, the report is due within 10 days of the season's close or by March 31, whichever comes first.
- **Penalty:** a $10 administrative penalty, which must be paid before you can buy a license the next year.
- **Category ban:** for Goat, Antlered Bull Moose and Sheep Any Ram, failing to report also bars future applications in that category.
- **Incentive:** reporting by January 10 enters you in an incentive permit drawing.
- **Quote:** "By midnight on January 31st, hunters must report their hunting activity for EACH special permit acquired AND each deer, elk, bear, moose, bighorn sheep, mountain goat, and turkey tag purchased in 2026 even if you did not hunt." "Hunters who do not meet the deadline must pay a $10 penalty before they can buy a license the following year." [1, p. 10]
- WDFW web page: "The deadline for big game and turkey reporting is Jan. 31. After the deadline date, the system will not allow you to report. Failure to report by the deadline will cause a $10 administrative fee to be assessed." — https://wdfw.wa.gov/hunting/requirements/harvest-reporting
