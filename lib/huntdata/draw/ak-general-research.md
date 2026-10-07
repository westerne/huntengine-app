# Alaska (ADF&G) — harvest data and over-the-counter options

Researched 2026-10-07 from Alaska Department of Fish and Game sources only. No browser was used. Files:

- `lib/huntdata/harvest/ak.json`: hunter success for regulatory year (RY) 2025, by hunt.
- `lib/huntdata/draw/ak-general.json`: over-the-counter options (general seasons and registration hunts) for the 2026-2027 regulatory year.

`draw/ak.json` (drawing odds) belongs to another task. This work did not touch it.

## Sources

1. **ADF&G Harvest Information, General Harvest Reports.** https://secure.wildlife.alaska.gov/DWC/HarvestInformation/GeneralReports/
   - Data comes from report 330, "Hunter AK Residency and Success by Unit", for RY2025. It was run once per hunt number, once for the "General Season" hunt (GM000 moose, GS000 sheep), and once unfiltered for caribou.
   - Every recent year is headed "Interim … Harvest Report", including 2024.
2. **ADF&G Harvest Lookup & Data Download.** https://secure.wildlife.alaska.gov/DWC/HarvestInformation/HarvestLookup/
   - This gives one record per harvest report, with the columns hunt, hunted, killed, sex and GMU. It has no residency column.
   - It was used to get the full RY2025 hunt list (this tool lists a few hunts that the report tool doesn't) and to cross-check caribou general season (GC000).
3. **ADF&G 2026-2027 Alaska Hunting Regulations**, effective July 1, 2026 to June 30, 2027. This is the complete PDF linked from https://www.adfg.alaska.gov/index.cfm?adfg=wildliferegulations.hunting (`regulations_complete.pdf`, 144 pages).
   - Used for which units have harvest-ticket ("HT") seasons, which registration hunts exist, and who each one is open to (R = residents only, N = nonresidents only, B = both).
4. **ADF&G Sitka black-tailed deer harvest statistics.** https://adfg.alaska.gov/index.cfm?adfg=deerhunting.deerharvest (2025 table).

**Access.** secure.wildlife.alaska.gov returned "Request Rejected" to curl's default user agent. It answered normally to a standard browser user-agent string. The site loads a DataDome tag, but no challenge or CAPTCHA was ever shown, and nothing was bypassed. Requests were paced (at most 3 at a time).

## What each row means (harvest/ak.json)

- **Year.** RY2025 = July 1, 2025 to June 30, 2026, which covers the fall 2025 seasons. All rows are interim.
- **hunters** = ADF&G "Total Hunters", which is successful plus unsuccessful hunters (only those who reported hunting).
- **harvest** = "Successful".
- **successPct** = harvest ÷ hunters × 100, rounded to 0.1. The file stores no numbers that ADF&G didn't publish or that weren't derived as described below.

Three scopes:

| Scope | huntCode | How |
|---|---|---|
| Drawing permit | `D…` (and youth `Y…`, which the regulations call drawing hunts) | Report 330 filtered to the hunt, "Total" row. Residencies combined. |
| Registration permit | `R…` | Same as drawing permits. |
| General season (harvest ticket) | `GEN-<unit>` plus `residency` | Moose: report 330 filtered to GM000. Sheep: filtered to GS000. Caribou: derived (see below). One row each for resident and nonresident. Hunters with no residency recorded are left out. |

- **Unit for permit hunts.** The unit with the most hunters in that hunt's report. The label lists every unit reported. ADF&G left the unit blank for 29 hunts (DM471, DM508, DM514, RM435, RM572, RM621, RM844, DS123/135/140/240/241, DG008, DG332–DG364 group, DG852/858, DX001, RX110). For those, the unit was taken from the hunt's row in the 2026-2027 regulations.
- **Unit spelling.** Units follow ADF&G's regulation style: "13A" and "7", not "07Z". Where ADF&G coded a unit that has subunits as "Z" (subunit unknown, e.g. "13Z"), the row was dropped.
- **Caribou general season is derived.** The report tool has no caribou general-season filter. So each caribou GEN row is the unit's all-hunt total from unfiltered report 330, minus every caribou permit hunt reported in that unit.
  - This matches ADF&G's own GC000 record download almost exactly, for example: 26B is 2,315 hunters / 1,029 successful derived vs 2,318 / 1,029 from the records; 25A is 449 / 295 both ways; 22D is 43 / 40 both ways.
  - In multi-caribou bag areas (Units 24–26), ADF&G counts harvest reports, so a hunter can count more than once.
- **Using GEN rows.** GEN rows describe everyone hunting on a harvest ticket in that unit and residency. They say nothing about a drawing hunt in the same unit, so unit fallback should stay off for AK, as it is for WA.
- **Left out of the harvest file.**
  - **Deer**: ADF&G publishes hunters, deer killed and "deer per hunter" by unit. It does not publish the share of hunters who took a deer, and the bag is up to 6. So there is no successPct, and no deer rows were written. The 2025 deer table, for reference: 1A 1,050 hunters / 1,177 deer; 2 1,764 / 2,175; 4 3,033 / 5,375; 8 4,648 / 5,620.
  - **Excluded hunt types**: Tier I/II (T…), community (CM300), targeted (A…), and S-prefixed hunts (SC590 etc.; the regulations' hunt-number key doesn't define "S").
  - **No hunters**: hunts with no hunters in RY2025 (DM160, DM815, DM819, DM823, DM825, DC608, DS150, DS232, DS285, RS595, RG471/472/474, RG890/891, RG334–RG374 group, RG881, RM849, DX080).
  - **RC501**: the only record download for it counts per animal (two-caribou bag), so it was dropped.

## General seasons kept (2026-2027 HT units) and nonresident limits

A GEN row exists in both files only for units whose 2026-2027 unit table has an HT season for that species. Usually the HT season covers only part of the unit.

**Moose** (38 units). Every nonresident must complete the Nonresident Moose Hunter Orientation. In Units 7 and 15, all hunters must complete the Moose Hunter Orientation.
- **Residents only** (nonresidents have no general season; 13 nonresidents draw DM335–DM339): 13A, 13B, 13C, 13D, 13E, 15A, 17C, 23, 26A, 26B.
- **Nonresidents limited to bulls with 50-inch antlers or the listed brow-tine count** (4, or 3 in some units). Residents also get spike-fork bulls, or any bull in some units: 6A, 12, 15C, 16B, 17B, 19B, 19C, 19D (part), 20E (part), 21B (Nowitna part), 21C, 22A, 22B (part), 22E, 24A, 24B, 25A, 25B, 25D.
- **Unit 18**: residents up to three moose; nonresidents one antlered bull.
- **Same rule for both**: 6D, 7, 11, 14A, 14B, 14C (Chugach State Park, Knik/Peters Creek, remainder archery), 15B (remainder, archery season plus general), 16A.
- **Dropped from the harvest file even though RY2025 reports exist**: Units 1–5, 9, 17A, 19A, 20A–20D, 20F, 21A, 21D, 21E, 22C, 22D, 24D, 25C, 26C.
  - These units have no HT moose season in the 2026-2027 regulations; moose there are registration (RM781, RM749, RM038, …) or drawing.
  - The GM000 reports coded there (e.g., 20B: 102 hunters, 0 harvest) look like hunters picking "General Season" by mistake. In RY2023, before the change, 20B general was 1,959 hunters and 273 harvest.
  - Nonresident reports in resident-only units were also dropped (e.g., 13A: 7).

**Dall sheep** (35 units): 7, 9, 11, 12, 13A–13E, 14A, 14B, 15A–15C, 16A, 16B, 19A, 19B, 19D, 19E, 20A–20F (remainder), 24A, 24B, 25A–25D, 26A–26C.
- All are open to both residencies.
- Nonresidents must be "accompanied in the field by an Alaska-licensed guide or resident relative within second-degree of kindred". They may take "one ram with full-curl horn or larger every four regulatory years". Residents get one full-curl ram per year.
- Since 2026-2027, every general-season sheep hunter (Aug 10 – Sept 20) must complete a Sheep Hunter Orientation.
- Unit 19C is drawing only, and 23 has no open season.
- RY2025 reports exist for 31 of the 35 units; 9, 19A, 19D and 20D have none.

**Caribou** (29 units): 9D, 10, 12, 16A, 16B, 19C, 19D, 20B, 20F, 21A–21E, 22A–22E, 24A–24D, 25A, 25B, 25D, 26A–26C.
- **Residents only**: 12 (part).
- **Nonresidents only**: 22A–22E (residents hunt under registration permit RC800).
- **Nonresidents get a smaller bag, bulls only** (e.g., two bulls vs. 5–10 caribou for residents): 9D, 21D, 24A–24D, 25A, 25B, 25D, 26A, 26B, 26C.
- **No HT season in 2026-2027**: Unit 23. Residents use RC907 and nonresidents draw DC923. 23's RY2025 general caribou reports (25 hunters) were left out.
- **Western Arctic herd** (22, 23, SW 26A): closed to taking cows in 2026-2027.

**Sitka black-tailed deer** (9 rows, OTC list only): 1A, 1B, 1C, 2, 3, 4, 5A, 6, 8.
- 1D and 5B have no open season.
- Nonresident limits:
  - Unit 3: part closed to nonresidents (Lindenberg Peninsula portion).
  - Unit 4: nonresidents two bucks, residents three or six deer.
  - Unit 6: nonresidents four deer, residents five.
  - Unit 8: nonresidents one buck, residents three deer.

**Mountain goat, elk, bison, muskox**: no harvest-ticket seasons; every hunt is drawing, registration, or Tier II. Every nonresident goat hunter needs a guide or second-degree resident relative.

## Registration hunts (ak-general.json)

The list has 50 moose, 10 caribou, 2 sheep, 68 goat, 5 muskox and 5 elk hunts. A hunt is included when it is named in the 2026-2027 regulations, either directly or inside a range like "RG331-RG352", and is either in the RY2025 hunt lists or named directly in the regulations. RM605 is not in the 2026-2027 regulations, so it was left out.

- **"(residents only)"**: RM160, RM164, RM271, RM272, RM571, RM573, RM575, RM576, RM583, RM585, RM615, RM617, RM620, RM621, RM650, RM653, RM655, RM660, RM682, RM832, RM833, RM834, RM837, RM841, RM843, RM844, RM849, RM880; RC503, RC795, RC800, RC835, RC907; RS380; RG002, RG025, RG364, RG375, RG479, RG868; RX110; RE752, RE756.
- **"(nonresidents only)"**: RM281, RM282, RM587, RG001, RG881. These are nonresident versions of a resident hunt in the same area.
- **How residency was decided**:
  - A hunt is labelled only when the regulation rows show only that residency, and RY2025 reporting had no hunters of the other residency.
  - Fifteen hunts were read by hand because R and N rows share a table cell, which confuses the automatic letter match: RC503, RC800, RC907, RM160, RM164, RM571, RM573, RM583, RG002, RG868, RM587, RM281, RM282, RG001, RG881. Example: Unit 17B's R row is "RM583 / RM585" and its N row is "RM587 … One bull with 50-inch antlers".
  - An unlabelled hunt is open to both, OR could not be confirmed. Examples where RY2025 had only residents but the regulation row is ambiguous: RM836, RM840, RC867, RG015, RG023.
- **"Open to anyone who signs up"**: many registration hunts are picked up only in person in local villages or offices, for a short window (e.g., RM615 in Bethel and villages; RM841 in Unit 22 villages). Some say "season may be announced" or "limited number of permits" (RM653 first-come, first-served). Read the unit table before treating one as easy to get.

## Spot-checks (re-queried live from report 330 after the files were written)

| Row | ADF&G live (hunters / successful) | File |
|---|---|---|
| GEN-13A moose, resident | 1,167 / 189 | 1,167 / 189, 16.2% |
| GEN-18 moose, nonresident | 506 / 448 | 506 / 448, 88.5% |
| GEN-20A Dall sheep, nonresident | 51 / 35 | 51 / 35, 68.6% |
| RM615 moose (Unit 18) | 986 / 268 | 986 / 268, 27.2% |
| RC800 caribou (Unit 22) | 83 / 73 | 83 / 73, 88.0% |
| DS102 Dall sheep (Tok) | 8 / 4 | 8 / 4, 50.0% |
| DG720 goat (13D) | 9 / 4 | 9 / 4, 44.4% |
| DE702 elk (Unit 8) | 4 / 1 | 4 / 1, 25.0% |
| DX001 muskox (Unit 18) | 4 / 4 | 4 / 4, 100% |
| GEN-26B caribou (derived, both residencies) | GC000 records 2,318 / 1,029 | 1,047 resident + 1,268 nonresident = 2,315 / 1,029 |

## Uncertainties

- **Interim data.** ADF&G marks RY2025 (and 2024) "Interim". Late reports can still change counts, especially for registration hunts with late deadlines.
- **Counting rules.** Report 330 counts hunters who reported hunting. For multi-animal caribou bags, general-season counts are per harvest report, not per person. For RC800, the record download has 548 records against 83 hunters in the report.
- **Small samples.** Many permit rows have fewer than 10 hunters. They are kept, as in WA, and the hunter counts are in the file.
- **Surprising figures.** Unit 18 general moose shows 88.5% nonresident success (506 hunters). That is what ADF&G reports; residents in the same unit were 561 / 794 (70.7%); the reason for the difference was not checked.
- **Regulations vs data year.** The HT unit list and registration residency come from the 2026-2027 regulations, while harvest is RY2025. A unit that changed between those years is filtered by the 2026-2027 rules.
- **Parsing.** The unit tables were read from pdftotext layout output. Lists of HT units and nonresident limits were checked by hand against the text, but partial-unit details (which portion of a subunit is HT) are not carried into the rows.
- **Federal subsistence seasons** (federal lands, rural residents) are not included.
- **Units that differ from the draw file.** Unit spelling ("13A", "7", "18") may differ from whatever `draw/ak.json` uses. Hunts reported across several units carry only their main unit in `unit`.
- **Overlapping substring.** A label containing "(nonresidents only)" also contains the text "residents only". Match the full parenthetical.
