# California (CDFW): draw rules, data sources and hunt-zone maps

Researched 2026-10-07. I used only California Department of Fish and Wildlife sources: wildlife.ca.gov, nrm.dfg.ca.gov documents, and CDFW's own BIOS ArcGIS services. I did not use a browser or any third-party site.

## Data years

- **Draw (`draw/ca.json`)**: the **2025** Big Game Drawing, held June 2025. On 2026-10-07 the CDFW statistics page (https://wildlife.ca.gov/Licensing/Statistics/Big-Game-Drawing) lists 2017 through 2025. No 2026 drawing statistics have been posted yet.
- **Harvest (`harvest/ca.json`)**: the **2025** season for all four species.

## Draw rules (verified, 2026 Big Game Digest)

Source for every quote below: *2026 California Big Game Digest* (updated 4/17/2026), https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=200602&inline (linked from https://wildlife.ca.gov/Publications/Hunting-Digest). Page numbers are the Digest's own.

- **System: modified preference points, used for every species.** Quote (p.20): "Under a Modified Preference Point System drawing, tag quotas for each hunt are split into two portions: one portion awarded by preference point drawings; the other portion awarded in Draw-By-Choice drawings."
- **Premium deer split is 90 / 10.** Quote (p.21): "Ninety percent (90%) of the individual zone or hunt tag quota shall be awarded using a Preference Point drawing. Ten percent (10%) … Draw-by-Choice."
  - Apprentice deer is split 50 / 50.
  - The preference round looks only at **first choices**: "Sort all applications according to the first choice tag, then preference point totals, and then random number."
  - The random round then runs through 1st, 2nd and 3rd choices.
- **Elk, pronghorn and bighorn sheep splits** (p.21):
  - "For quotas of one (1), the tag shall be awarded using a Draw-By-Choice drawing."
  - A quota of 2 is split 1 preference + 1 random. A quota of 3 is split 2 + 1.
  - "For quotas of four (4) or more, seventy-five percent (75%) of the quota shall be awarded using a Preference Point drawing."
  - For these species, "The draw-by-choice round of the drawing is conducted first then the preference point round."
  - You pick one hunt choice per species. The application worksheet shows a single "Hunt Choice" box.
- **Party applications average their points**, so point values can be fractions. Quote (p.20): "Determine the preference point value for party applications by averaging all party members' preference points … Preference point averages are not rounded up or down."
  - This is why the deer stats show values like 8.6667, and why elk and pronghorn columns go in half points.
  - Parties can have up to 6 people for deer. For elk and pronghorn, only residents may form a party, and only of two. Bighorn applicants cannot apply as a party.
- **Point cap.** Quote (p.42): "For the 2026 Big Game Drawing, 24 is the maximum number of preference points for any species a hunter can have." The 2025 tables print "(23)" as the 2025 maximum.
- **Bighorn sheep: there is no "modified-bonus" system.** The Digest describes the same modified preference point drawing for bighorn as for elk and pronghorn. The words "bonus point" do not appear anywhere in the 2026 Digest. Bighorn-specific rules:
  - "must not have drawn a California bighorn sheep tag in any prior year", which makes it once in a lifetime.
  - Applicants must be 16 or older.
  - There is a mandatory hunter orientation.
- **Nonresident limits** (p.42):
  - Elk and pronghorn: "Only one nonresident may be drawn for an elk or pronghorn tag annually."
  - Bighorn sheep: "Not more than 10 percent of the bighorn sheep tags shall be awarded to non-residents each year."
  - Deer: there is no nonresident cap in the draw. Nonresidents buy a "Nonresident 1st Deer Tag/Application" ($377.35).
  - CDFW does **not** split any drawing statistic by residency.
- **Application window and deadline:** April 15 to **June 2** (midnight). Quote (p.17): "The Big Game Drawing application period begins April 15, 2026. All transactions for Big Game Drawing entries must be completed before midnight on June 2, 2026." Results come out "on or around June 15, 2026". This matches https://wildlife.ca.gov/Licensing/Hunting/Big-Game: "Applications for the big game drawing are available each year on April 15 through June 2."
- **Points.** Applicants who do not draw earn 1 point. A hunter can also apply for a point only, using code PD (deer), 499 (elk), 799 (pronghorn) or 599 (sheep).

## Sources used for the numbers

1. **2026 Big Game Digest, "2025 Deer Tag Drawing Statistics", pp.29–31** (link above). For each deer hunt it prints:
   - tag quota, preference quota and random quota
   - total 1st-choice applicants
   - 1st-choice applicants holding the maximum (23) points
   - tags awarded in the preference drawing
   - the **highest and lowest point value that drew** in the preference drawing
   - random-round tags awarded to 1st-, 2nd- and 3rd-choice applicants
2. **2026 Big Game Digest elk (pp.48–52), pronghorn (pp.58–59) and bighorn (p.61) tables.** For each hunt they print:
   - 2025 tag, preference and random quotas
   - total applicants
   - applicants holding the maximum points
   - **2025 hunter success (%)**
3. **CDFW "2025 … Tag Drawing Statistics – Number of Applicants by Point Value" PDFs**, from https://wildlife.ca.gov/Licensing/Statistics/Big-Game-Drawing. Each file covers one point range (0–7, 8–15, 16–23):
   - Deer: …DocumentID=242657 (apprentice), 242658/242659/242660 (area-specific archery), 242661/242663/242664 (general late season), 242665/242666/242667 (muzzleloader), 242669/242670/242671 (zone hunts)
   - Elk: 242638 (apprentice), 242639/242640/242641 (antlerless and either-sex), 242643/242644/242645 (bull and spike)
   - Pronghorn: 242634 (apprentice), 242635/242636/242637
   - Bighorn sheep: 242632/242633
   - Full URL pattern: `https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=<id>&inline`
   - I used these PDFs for hunt names, and to check that each row's quota, preference quota, random quota and applicant count match the Digest. All rows matched except elk 315 (see "Uncertain" below).
4. **2025 California Deer Harvest Statistics**: https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=245246&inline, linked from https://wildlife.ca.gov/Hunting/Deer. I used Table 1, "Statewide Deer Harvest and Hunter Success by Hunt", with data as of April 13, 2026.

## How each field was derived

### Draw (`draw/ca.json`)

Row counts: **DEER 82, ELK 73, PRONGHORN 14, BIGHORN 12.**

- **Deer:**
  - `tags` is the tag quota. `applicants` is total 1st-choice applicants.
  - `successPct` = (tags awarded in the preference drawing + random-round tags awarded to 1st-choice applicants) ÷ 1st-choice applicants × 100, capped at 100. I computed this; CDFW does not print it.
  - `minPoints` is CDFW's "Lowest Point Value Awarded Tag in Preference Drawing". It is 0 when every 1st-choice applicant drew.
  - `pools` splits the stat into the preference pool and the random pool. The random pool's applicants = 1st-choice applicants minus tags awarded in the preference round.
  - The label records the highest and lowest point values that drew, the number of max-point applicants, and how many tags went to 2nd- or 3rd-choice applicants.
- **Elk, pronghorn, sheep:**
  - There is one hunt choice per application, so `successPct` = min(quota, applicants) ÷ applicants × 100.
  - `minPoints` is null because CDFW does not publish it for these species.
  - Pool tags come from the printed preference and random quotas. Pool applicant counts are not published, so they are null.
- **Residency:**
  - Deer: the combined figures are copied into both `resident` and `nonresident`, because everyone draws from the same pool.
  - Elk, pronghorn and sheep: the combined figures go in `resident`, and `nonresident` is null because of the nonresident caps above.
- **`pointLines` is not filled.** CDFW publishes how many applicants held each point value, but not how many drew at each value. I did not compute or estimate those numbers.
- **Weapon:**
  - "General Season" and "General Methods" are mapped to rifle.
  - Zones D12, D14 and D17 ("Archery and General Seasons") are mapped to any.
  - G19 (shotgun, archery or crossbow) is mapped to any.
  - The MA hunts and elk hunt 303 are muzzleloader *or* archery hunts. I tagged them muzzleloader.
- **Left out:**
  - Point-only codes.
  - Hunts new for 2026, which show "-" in the Digest. These are elk 311, 312, 343, 348, 371, 392, 393, 394, 396, 426, 487, 490, 496 and 317, and bighorn zones 11–13 (514–516).
- **No season dates.** The Digest prints 2026 dates, not the 2025 ones.

### Harvest (`harvest/ca.json`)

Row counts: **DEER 111, ELK 69, PRONGHORN 13, BIGHORN 12.** Deer is reported **per hunt or zone**; elk, pronghorn and sheep are reported **per hunt**.

- **Deer:**
  - `harvest` is CDFW's "Total Estimated" kill, which corrects the reported kill for non-reporting.
  - `successPct` is CDFW's "Percent Hunter Success" (estimated kill ÷ tags issued).
  - `hunters` is null because tags issued are not printed.
  - B-zone, C-zone and D3-5 tags are each good in a group of zones. For those, CDFW's success figure covers the whole group; the label says so.
  - I added a separate row for draw hunt `C` that carries the C-group figure (30.1%), with harvest null.
  - Left out: AO (statewide archery-only) and the fundraising tags (Gold Opp, Open Zone).
- **Elk, pronghorn, sheep:** only the Digest's "2025 Hunter Success (%)" is published, so `hunters` and `harvest` are null. Newer harvest-count PDFs on wildlife.ca.gov stop at 2022 for elk and 2023 for pronghorn.
- **Draw hunts with no harvest row:** pronghorn 790 (conflicting figures, see below) and elk 329, 464, 471 and 472 (the Digest prints "-").

## Spot-checks (source vs JSON)

| Hunt | Source values | JSON |
|---|---|---|
| Deer X5B | Digest: quota 50 (45/5), 2,590 1st-choice applicants, 45 pref-awarded, high 23 / low 19, 5 random to 1st choice. Harvest: est. 30, 68.2% | tags 50, apps 2590, success 1.9% (50/2590), minPoints 19; harvest 30, 68.2% ✔ |
| Deer G3 | quota 25 (23/2), 3,854 apps, 86 at max, low 23; harvest est. 20, 90.9% | tags 25, apps 3854, 0.6%, minPoints 23; 20 / 90.9% ✔ |
| Deer A26 | quota 30 (27/3), 509 apps, low 13; stats PDF same quota and apps | 30 / 509 / 5.9% / 13 ✔ |
| Elk 305 Northeastern bull | quota 15 (12/3), 3,463 apps, 244 at max, 86.7% hunter success | 15 / 3463 / 0.4%; harvest 86.7% ✔ |
| Pronghorn 740 Lassen P1 | quota 35 (27/8), 5,610 apps, 90.6% | 35 / 5610 / 0.6%; harvest 90.6% ✔ |
| Bighorn 503 Clark/Kingston | quota 4 (3/1), 1,535 apps; stats PDF identical | 4 / 1535 / 0.3%; harvest 100% ✔ |

## Uncertain or not published

- **Deer `successPct`** is my own calculation. It leaves out tags that went to 2nd- or 3rd-choice applicants; the label shows those, e.g. C zones 2,185 and A1 1,391 + 49.
- **Elk, pronghorn and sheep `successPct`** assumes the full 2025 quota was handed out in the draw. CDFW does not print how many tags were issued or how many went to alternates.
- **Elk 315 (West Tinemaha P1 bull):** it is in the Digest (quota 1, 230 applicants) but not in any 2025 stats PDF. The label comes from the Digest.
- **Elk 464:** the 2025 stats PDF calls it "La Panza Period 1 Apprentice – Antlerless", but the 2026 Digest lists it as "Spike Bull". The hunt changed for 2026, so I kept the 2025 name.
- **Pronghorn 790 (Zone 4 Lassen apprentice):** the Digest prints 2025 hunter success as 80% in the apprentice table and 100% in the general-methods table. I left it out of the harvest file.
- **X-zone weapon:** I tagged X zones "rifle" from the label "General Season". I did not confirm whether an X-zone tag is also valid in that zone's archery season.
- **Deer harvest row `A`:** the zone layer has two polygons, "A (North Unit 160)" and "A (South Unit 110)", so the unit "A" does not match a single polygon.
- **No residency split** is published anywhere.
- **Applicant counts for elk and pronghorn parties:** it is not stated whether party members are counted individually. The half-point columns suggest they are.

## Hunt-zone boundary layers (CDFW BIOS, official, public)

All layers are on `https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/`, owner BIOS_Admin. Each is a polygon layer, layer 0, stored in Web Mercator; ask for `outSR=4326`.

| Species | Layer | Unit field | Values used in JSON |
|---|---|---|---|
| Deer zones | `biosds342_fpu/FeatureServer/0` ("Deer Hunt Zones – Title 14, Section 360 [ds342]") | `Zone_Nam` (string) | "X1", "X3a", "X9c", "D12", "C1"… (**lower-case suffix**: "X3a", not "X3A"; D15 has 2 polygons; A zone is "A (North Unit 160)" / "A (South Unit 110)") |
| Deer G / J / M / MA hunts | `biosds3241_fpu/FeatureServer/0` ([ds3241]) | `Zone` (string) | "G1", "J10", "M3", "MA1" |
| Deer A (archery) hunts | `biosds3242_fpu/FeatureServer/0` ([ds3242]) | `Zone` (string) | "A16" (A1 is 4 polygons, C1–C4) |
| Elk | `biosds786_fpu/FeatureServer/0` ("Elk Hunt Zones [ds786]") | `NAME` (string) | "Northeastern", "Grizzly Island", "Lone Pine"… |
| Pronghorn | `biosds787_fpu/FeatureServer/0` ([ds787]) | `Zone` (small integer) | 1–6; the JSON stores it as the string "4" |
| Bighorn sheep | `biosds784_fpu/FeatureServer/0` ([ds784]) | `Zone_Num` (integer) | 1–13; the JSON stores it as a string |

I checked every `unit` and `units[]` value in `draw/ca.json` against these layers on 2026-10-07, and all of them exist. In `harvest/ca.json`, every unit exists except "A".

Working tests (2026-10-07):

```
curl "https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds342_fpu/FeatureServer/0/query?where=Zone_Nam%3D%27X9a%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 Polygon, Zone_Nam "X9a", OBJECTID 46

curl "https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3242_fpu/FeatureServer/0/query?where=Zone%3D%27A16%27&outFields=Zone,Hunt_Name&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 Polygon, Hunt_Name "Zone X9a Archery Hunt"
```

## Post-hunt harvest reporting (mandatory)

Source: https://wildlife.ca.gov/Licensing/Hunting/Tag-Reporting, plus 2026 Digest pp.24–25.

- **Deer: mandatory for every tag holder**, including hunters who were unsuccessful or did not hunt (T14 CCR §708.5).
  - Deadline: within 30 days of the kill or by **January 31**, whichever comes first. Unsuccessful hunters and those who did not hunt must report by January 31.
  - Penalty: a **$21.60 non-reporting fee**, charged before you can buy a deer tag or deer drawing application the next year.
  - Quote (Tag Reporting page): "Successful deer tag holders are required to report deer harvested within 30 days of the date of harvest or by January 31, whichever date is first. Unsuccessful deer tag holders, whether they hunted or not, are required to report no harvest by January 31."
  - Quote (Digest p.24): "Deer tag holders, whether successful, unsuccessful, or did not hunt, who fail to report by the January 31 deadline are subject to the non-reporting fee of $21.60 prior to the issuance of a deer tag or deer tag drawing application in the following year."
- **Elk** (§708.11): "All tag holders must submit a harvest report. Successful hunters must report immediately. Unsuccessful hunters must submit a report within one week after the close of the elk season." No fee is stated.
- **Pronghorn** (§708.10): all tag holders. Successful hunters report immediately; unsuccessful hunters report within one week after the season closes. No fee is stated.
- **Bighorn sheep** (§708.09): "All tag holders must submit a report within 10 days after the close of the season." Per the Digest, successful hunters must also phone CDFW within 24 hours and meet CDFW staff within 48 hours.
- **How to report:** online at licenses.wildlife.ca.gov/InternetSales under "Harvest Reporting", or by mail to CDFW Wildlife Branch, P.O. Box 944209, Sacramento, CA 94244-2090.
