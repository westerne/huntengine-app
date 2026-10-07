# Oregon (ODFW): draw rules, data sources and hunt-unit map

Researched 2026-10-07. Only Oregon Department of Fish and Wildlife sources were used (myodfw.com, dfw.state.or.us, and ODFW's own ArcGIS server, nrimp.dfw.state.or.us). No browser was used. No bot challenges came up.

## Files

| File | What | Rows |
|---|---|---|
| `draw/or.json` | 2026 draw (held June 2026) | DEER 296, ELK 365, ANTELOPE 79, BIGHORNSHEEP 30, MTNGOAT 12 (782 total) |
| `harvest/or.json` | 2025 season harvest, **per hunt and per WMU** | DEER 257, ELK 400, ANTELOPE 67, BIGHORNSHEEP 28, MTNGOAT 12 (764 total) |

Oregon has no moose season, so there is no MOOSE data. Spring bear (700 series) was left out because it is not one of the species in scope.

How the DEER draw rows break down: 161 buck (100 series), 72 antlerless (600 series) and 63 premium (L series). ELK: 301 controlled (200 series) and 64 premium (M). ANTELOPE: 53 controlled (400) and 26 premium (N).

## Draw rules (verified, with quotes)

Sources:
- [A] ODFW, *Controlled hunt navigation / How to apply*: https://myodfw.com/articles/controlled-hunt-navigation
- [B] ODFW, *How to check (and earn) preference points*: https://myodfw.com/articles/how-check-and-earn-preference-points
- [C] ODFW Commission packet, Exhibit D Attachment 4, *Draft Oregon Administrative Rules* for the 2026 regulations (Sept 2025): https://myodfw.com/sites/default/files/2025-09/Exhibit%20D_Attachment%204_Draft%20Oregon%20Administrative%20Rules.pdf
- [D] ODFW Commission packet, Exhibit D Attachment 3 amendment, *2026 Staff Proposals, Big Game Regulations* (revised 9-9-2025): https://myodfw.com/sites/default/files/2025-09/Exhibit%20D_Attachment%203_Amendment_2026%20Staff%20Proposals_Big%20Game%20Regulations_REVISED_9-9-2025_.pdf
- [E] ODFW, *How to read a point summary report*: https://myodfw.com/articles/how-read-point-summary-reports

**System: preference points with a 75/25 split.** This is a hybrid. 75% of tags go by points, and 25% go by pure random draw.
- "Most tags (75 percent) are awarded based on preference points." "The remaining 25 percent of tags are awarded randomly amongst all remaining first-choice applicants" [A].
- How it runs: applicants "are grouped by preference points and first-choice hunt selected … until 75 percent of the tags have been awarded … All remaining first-choice applicants are rearranged solely by 7-digit random number and the remaining 25 percent of tags are awarded randomly" [A]. Then second-choice applicants are drawn, and so on. "Preference points are not a factor for awarding 2nd, 3rd, 4th and 5th choices" [A].
- Earning points: if you don't draw your first choice for pronghorn, deer, elk or spring bear, you get a point. "Drawing a first-choice hunt within a hunt series takes the successful hunter's point total back to zero whether or not they purchase the tag" [B]. You can also buy a Point Saver from Dec. 1 to May 15 and from July 1 to Nov. 30 [B].
- Points don't expire: "Hunters will not forfeit their preference points if they do not apply for a hunt series for two or more consecutive years" [B]. "Applicants who have their license suspended by legal action will forfeit all preference points" [B].
- Party applications: points are averaged across the party, and .51 rounds up [B].
- No points for sheep or goat: "500 – Bighorn sheep (no preference points awarded for sheep hunts)" and "900 – Rocky Mountain goat (no preference points awarded for goat hunts)" [A].
- Premium hunts (L, M, N): "No preference point advantage. All applicants have an equal chance to draw a tag." "Open to nonresident hunters." "Premium tags are not once-in-a-lifetime tags" [A].

**Nonresident limits** (OAR 635-060-0030(2)) [C]: "The number of controlled deer, controlled elk, and controlled spring bear tags issued to nonresident applicants shall not exceed five percent of the tags authorized for each hunt. The number of controlled pronghorn antelope tags issued to nonresident applicants shall not exceed three percent of the tags authorized for each hunt. Exception: one nonresident tag may be issued for each hunt when the number of authorized tags is fewer than 35." ODFW does not publish how each hunt's tags split between residents and nonresidents. For sheep and goat, the Commission tables [D] do list a resident/nonresident split per hunt.

**Once-in-a-lifetime and waiting periods** [C, OAR 635-065-0015(7)-(8)]: "a person may obtain and possess only one bighorn sheep ram tag in a lifetime" and "only one Rocky Mountain goat tag in a lifetime." Ewe hunts are different: "Persons drawing bighorn tags with an ewe bag limit are not subject to the once-in-a-lifetime restriction" [D]. For deer, elk and pronghorn I found no waiting period in these sources. Drawing your first choice only resets your points to zero.

**Deadline**: "The deadline to apply for a big game controlled hunt is May 15", and Step 4 reads "apply by May 15 11:59 p.m. PT" [A]. Results: "Controlled hunt draw results are announced by June 12 each year" [A]. **Application month = May.**

## Data in draw/or.json

Year: **2026** (the June 2026 draw). The ODFW page that lists all the reports is https://myodfw.com/articles/point-summary-reports (updated July 1, 2026).

1. **Deer (100 buck + 600 antlerless), elk (200), pronghorn (400)**: ODFW *2026 Preference Point Draw Report* xlsx files:
   - https://myodfw.com/sites/default/files/2026-07/2026%20Buck%20Deer%20Preference%20Point%20Draw%20Report.xlsx
   - https://myodfw.com/sites/default/files/2026-08/2026%20Antlerless%20Deer%20Preference%20Point%20Draw%20Report_0.xlsx
   - https://myodfw.com/sites/default/files/2026-07/2026%20Elk%20Preference%20Point%20Draw%20Report.xlsx
   - https://myodfw.com/sites/default/files/2026-07/2026%20Pronghorn%20Antelope%20Preference%20Point%20Draw%20Report.xlsx

   Report columns, as defined in [E]. Section A covers both phases for first-choice applicants: Tags Authorized, Resident Apps/Drawn, Non-Resident Apps/Drawn. Section B is per point class, and [E] calls it "Preference Point Draw (75% of tags) Stats by point class".
   - `tags` = Tags Authorized. `draw.resident.tags` and `draw.nonresident.tags` are null because ODFW doesn't publish the split.
   - `applicants` = first-choice applicants from Section A.
   - `successPct` = first-choice drawn ÷ first-choice applicants × 100. I computed it and rounded to 0.1.
   - `pointLines`: applicants per point class (residents and nonresidents separately), and the number drawn in that class **during the 75% points phase only**. I checked this on hunt 610: Section B drawn adds up to 306 of 408 tags (75%), and points spent by the drawn equal ODFW's "Total Points Drawn P1". Random-phase winners are not broken out by point class.
   - `minPoints` = the lowest point class that drew in the points phase, which is the real cutoff. If every first-choice applicant drew (for example 200M Cascade Muzzleloader), `minPoints` = the lowest point class that applied.
   - Integrity checks in the build: Section B applicants add up to Section A applicants for every hunt. Two hunts break ODFW's own totals for nonresidents: **615** Willamette antlerless (0 NR applicants but 14 NR drawn) and **470C** Hart Mtn pronghorn (0 NR applicants but 1 NR drawn). Their nonresident stats are null.
2. **Premium (L/M/N), bighorn sheep (500), mountain goat (900)**: only *Applicants by Hunt Choice* reports exist for these. Those reports give 1st through 5th choice counts for all residencies combined and no draw results.
   - `applicants` = 1st-choice applicants.
   - `successPct` = null.
   - `tags` = the **proposed 2026** tag numbers in Commission packet [D], Appendices 5, 6 and 8, including the res/NR split for sheep and goat. These were not cross-checked against the final printed 2026 regulations. ODFW's regulations booklet is hosted off ODFW's domains, so I didn't use it.
   - 575A1 tags couldn't be read because of a struck-through amendment, so they are null. Blank NR cells in [D] are null.
   - Source files: `2026-07/2026%20Premium%20{Buck%20Deer,Elk,Pronghorn%20Antelope}%20Applicants%20by%20Hunt%20Choice.xlsx`, `2026-07/2026%20Bighorn%20Sheep%20Applicants%20by%20Hunt%20Choice.xlsx` and `2026-07/2026%20Rocky%20Mountain%20Goat%20Applicants%20by%20Hunt%20Choice.xlsx`, all under https://myodfw.com/sites/default/files/.
3. **Weapon**: a hunt name containing "Bow" maps to archery, "Muzzleloader" to muzzleloader, and anything else to rifle (any legal weapon, the same approach as nv.json). NB601 and NE605 ("Archery/Muzzleloader ONLY"), premium, sheep and goat rows have no weapon.
4. **Units**:
   - **WMU-based hunts.** This covers all of western Oregon, all elk and pronghorn, sheep, goat, and the L10–L30/M/N premiums. `unit` = the WMU number from the hunt number (series digit + two-digit WMU). ODFW states this convention for premium hunts: "the Premium deer hunt in Applegate Unit is L28" [A].
   - **Extra units.** `units[]` adds every WMU where ODFW's 2025 harvest summaries list the same hunt number. Example: 210C1 maps to 10 and 11. For 200M and 200R the code has no WMU, so their units come only from the harvest summary.
   - **Partial units and the convention itself.** Hunts are often parts of a WMU. The convention is inferred for 5xx sheep and 9xx goat hunts (for example 543 John Day River maps to 43 Biggs, and 950 Elkhorn maps to 50 Desolation). Treat sheep and goat units as approximate.
   - **Eastern Oregon deer hunt areas (new in 2026).** ODFW replaced WMU-based eastern Oregon deer hunts with herd-based "hunt areas" [D]: "a new and different mule deer hunting landscape in Oregon". The hunt code encodes the area. For example DG102 is the Devils Garden area 02 buck hunt and NE601 is the Northeast area 01 antlerless hunt. `unit` = the area ID exactly as ODFW writes it in [D] ("All of Hunt Area DG02"), e.g. `DG02`, `NE01`. **No official public boundary layer for these hunt areas was found**, so they won't join to the WMU layer.

## Data in harvest/or.json

Year: **2025 season**. Source page: https://myodfw.com/articles/big-game-hunting-harvest-statistics

- Deer, elk and pronghorn come from ODFW's *2025 Estimated … Harvest by Zone, Wildlife Management Unit and Hunt, based on Mandatory Harvest Survey Reports* PDFs:
  - https://myodfw.com/sites/default/files/2026-04/Elk_Any_Legal_Weapon_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Elk_Archery_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Elk_Muzzleloader_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Buck_Deer_Any_Legal_Weapon_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Buck_Deer_Archery_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Buck_Deer_Muzzleloader_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Antlerless_Deer_Harvest_Summary.pdf
  - https://myodfw.com/sites/default/files/2026-04/Pronghorn_Harvest_Summary.pdf

  These are **per hunt AND per WMU**. A multi-unit hunt has one row per WMU, based on where hunters reported hunting most. Only the "Controlled" sections are used; general-season rows are dropped.
  - `hunters` = Total Hunters.
  - `harvest` = Harvest Total.
  - `successPct` = ODFW's printed Success %. These are survey estimates, so the % is often 1–2 points off harvest ÷ hunters. I kept ODFW's figure. Harvest Total also doesn't always equal antlerless + antlered (194 rows are off by a little), which is ODFW's rounding of estimates.
  - Unit names are matched to WMU numbers using the ODFW WMU layer.
- Sheep and goat come from the *2025 Oregon Reported Bighorn Sheep / Rocky Mountain Goat Harvest* tables:
  - https://myodfw.com/sites/default/files/2026-02/Bighorn_Sheep_Harvest_Summary_2025.pdf
  - https://myodfw.com/sites/default/files/2026-02/Rocky_Mountain_Goat_Harvest_Summary_2025.pdf

  These give tags, harvest and % success, where success = harvest ÷ tags. `hunters` = null because hunters afield isn't published.
- Rows left out:
  - Rows printed over 100%: 210C2 Scappoose portion (133%), 546A (133%), 568A1 (200%) and 946A (200%). ODFW notes that auction, raffle and tribal tags were filled in some areas.
  - The second "559A1 S Snake Rvr" line, because ODFW's table repeats the hunt number.
  - Three short rows with blank cells: 119A McKenzie portion, 644A2 and 644A3.
  - Rows with 0 hunters.
- **Caveat:** the 2025 eastern Oregon deer hunt numbers (131–178 and others) no longer exist in 2026, so those rows can only attach by WMU. The 2026 hunt areas have no harvest history yet.

## Spot checks (source vs JSON)

Draw rows were checked against ODFW's PDF versions of the same reports, which pdftotext reads independently of the xlsx parser:
1. **248R2 Heppner Unit Bow No. 2 (elk).** Tags 1430. Residents 255 applied and 253 drew (99.2%). Nonresidents 157 applied and 55 drew (35.0%). JSON matches.
2. **112 Wilson Unit (buck).** Tags 17. Residents 561/17 (3.0%). Nonresidents 23/0. Resident points-phase cutoff = 10 points. JSON matches.
3. **DG102 Devils Garden 02 (buck).** Tags 1430. Residents 2321/1403 (60.4%). Nonresidents 42/27 (64.3%). The 0-point class had 983 resident applicants and 0 drawn in the points phase. JSON matches.
4. **210C1 Upper Nehalem No. 1 (elk).** Tags 82. Residents 266/80 (30.1%). At 2 points, 69 applied and 15 drew. Nonresidents 3/1. JSON matches.
5. **543A1 John Day Rvr No. 1 (bighorn).** 4154 first-choice applicants in the PDF report. Proposed 2026 tags 8 (8 resident, 0 nonresident) in [D]. JSON matches.

Harvest rows:
6. **218A N Alsea (elk ALW).** 110 hunters, 76 harvest, 69%. Matches.
7. **266R N Malheur Rvr Bow.** 352 hunters, 74 harvest, 21%. Matches.
8. **438 Grizzly Unit (pronghorn).** 4 hunters, 3 harvest, 75%. Matches.
9. **610 Saddle Mtn Unit (antlerless).** 317 hunters, 178 harvest, 56%. Matches.
10. **950A3 Elkhorn No. 3 (goat).** 3 tags, 2 harvest, 67%. Matches.

## Hunt-unit boundary layer (ODFW official)

- Service: `https://nrimp.dfw.state.or.us/arcgis/rest/services/ODFW_Admin/WildlifeManagementUnits/MapServer/0`. A FeatureServer version is also at `.../ODFW_Admin/WildlifeManagementUnits/FeatureServer/0`. The service description says: "Oregon Department of Fish and Wildlife management unit boundaries are published in the Oregon Big Game Hunting Regulations. The mapping was updated in July 2016."
- **Unit field: `UNIT_NUM`** (esriFieldTypeSmallInteger, e.g. 12). The name is in `UNIT_NAME` (e.g. "WILSON"). Other fields: REGION (WEST/EAST), Acres.
- It has 69 features: the WMUs 10–78 plus Crater Lake NP (UNIT_NUM 1) and the Warm Springs Reservation (UNIT_NUM 0).
- Because `UNIT_NUM` is a number, query it without quotes. The JSON `unit` strings ("12") have to be turned into numbers first. Eastern Oregon deer hunt-area units (e.g. "DG02") are not in this layer.
- Tested 2026-10-07:
  ```
  curl "https://nrimp.dfw.state.or.us/arcgis/rest/services/ODFW_Admin/WildlifeManagementUnits/MapServer/0/query?where=UNIT_NUM%3D12&outFields=UNIT_NUM,UNIT_NAME&returnGeometry=true&outSR=4326&f=geojson"
  → HTTP 200, FeatureCollection, 1 Polygon, {"UNIT_NUM": 12, "UNIT_NAME": "WILSON"}
  ```
  The same query with UNIT_NUM=58 returns CHESNIMNUS.
- ODFW's ArcGIS Online also has a copy of the same WMUs ("ODFW Wildlife Management Units (WMUs) (Compass dataset)", owner eszter.collier_ODFW). I didn't use it.
- The 2026 eastern Oregon **deer hunt-area** boundaries: I searched ArcGIS Online and ODFW's server folders (ODFW_Admin, ODFW_Regs, HerdComp) and found **no official layer**. The only hits were third-party (e.g. "Oregon Hunting Units and Controlled Hunts 2026 James Noyes"), and I didn't use them.

## Post-hunt harvest reporting (mandatory)

- **Who:** "Every hunter who purchased a deer, elk, cougar, bear, pronghorn or turkey tag needs to report … even if you didn't hunt or weren't successful." Source: https://myodfw.com/articles/report-your-hunt
- **Deadline:** "Hunters have until January 31 (or April 15 if purchased a late tag) each year to report their previous year's hunts" (same page). OAR 635-065-0011 [C] says the same: January 31 for hunts ending April 1 to December 31, and April 15 for hunts ending January 1 to March 31.
- **Consequence:** "A $25 penalty will be assessed for any hunter who fails to report deer and elk tags by the reporting deadline. The penalty is paid with the purchase of a hunting license two years hence. Only a single penalty is assessed, regardless of the number of tags you did not report" (same page). Under the OAR, anyone who doesn't report "will not be able to obtain a license to hunt game mammals or game birds in Oregon without paying a penalty" [C]. There is no penalty for not reporting pronghorn, bear or cougar tags.
- **Sheep and goat:** the OAR says "All big game tag holders, except for bighorn sheep and Rocky Mountain goat … are required to report hunting effort and harvest" [C]. So sheep and goat are outside the mandatory survey. I did not verify whether those animals must be checked in, and the OAR text I fetched doesn't cover it.
- **Incentive:** hunters who report on time go into a drawing for 3 special deer/elk/pronghorn tags [C, OAR 635-060-0030(5)].

## Uncertain / not done

- Sheep, goat and premium tags are the Commission **proposals** (amended 9-9-2025), not the final 2026 regulations.
- Sheep and goat units are inferred from the hunt-number convention. Real hunt areas cross WMU lines.
- Residency is not published for premium, sheep and goat applicants or draw results, and draw odds are not published for those hunts.
- Nonresident data for 615 and 470C is internally inconsistent in ODFW's report, so it is set to null.
- There is no boundary layer for the 2026 eastern Oregon deer hunt areas.
- Season dates are not in the draw reports and weren't added.
- Harvest is 2025 and the draw is 2026. Hunt codes changed for eastern Oregon deer.
- I didn't check whether sheep and goat hunters must check in their animals.
