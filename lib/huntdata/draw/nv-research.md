# Nevada (NDOW) — draw rules and hunt-unit map

Researched 2026-10-07 from Nevada Department of Wildlife sources only (ndow.org and NDOW's ArcGIS Online services).

## DRAW RULES (2026 application season)

Nevada runs a random draw with bonus points. Each bonus point is squared, and you get one more number for your application, so you get (points² + 1) random draw numbers. Your lowest number is the one used, and tags go out from the lowest number up [1]. You need an active Nevada hunting or combination license to earn a bonus point. If you don't draw, your application turns into a bonus point. You lose your points if you skip applying for that hunt category two years in a row [1]. Commission Policy 24 sets quotas at about 90% resident and 10% nonresident [1]. Moose and the desert bighorn management/one-horn ram are once-in-a-lifetime. Other species have waiting periods after you draw: bighorn ram and mountain goat 10 years, elk 7, antelope 3, bighorn ewe 2, mule deer none [1]. Main-draw applications for 2026 closed May 13, 2026 at 11:00 pm Pacific, and results were due by May 29, 2026 [2].

Sources:
1. NDOW, *2026 Big Game Application FAQ* (updated 2/3/2026): "How do Bonus Points Work in Nevada?", "Main Draw", "Waiting Periods" — https://www.ndow.org/wp-content/uploads/2026/03/2026-Big-Game-Application-FAQ.pdf
2. NDOW Commission Regulation 26-01, *2026-2027 Application Deadlines & Draw Result Dates* (approved January 2026) — https://www.ndow.org/wp-content/uploads/2026/01/CR-26-01-2026-2027-Application-Deadlines-Draw-Result-Dates-NBWC-Approved-January-2026.pdf
   (draw order: Silver State → PIW → junior mule deer → bighorn rams / antlered elk / antelope horns longer / antlered mule deer / goat / bear / moose → … → spike elk → antlerless elk depredation)

Related: tag eligibility and limits are in CR 26-02 — https://www.ndow.org/wp-content/uploads/2026/01/CR-26-02-2026-Tag-Application-Eligibility-and-Tag-Limits-NBWC-Approved-January-2026.pdf

## Data used in nv.json (draw) / harvest/nv.json

- Draw: the 2025 Big Game Main Draw "Bonus Point and Application Choice Trends" PDFs (one per class/weapon, some split by residency, posted Jan–Apr 2026). The 2026 versions are not posted yet; NDOW only has the 2026 public list of successful applicants (names), which has no statistics.
- Hunt numbers: CR 25-13 *2025 Big Game Quotas* — https://www.ndow.org/wp-content/uploads/2025/08/CR25-13-2025-Big-Game-Quotas-NBWC-Approved-May-2025-FINAL.pdf ; CR 25-10 NR guided mule deer (hunt 1235) — https://www.ndow.org/wp-content/uploads/2025/07/CR-25-10-2025-2026-Restricted-Nonresident-Guided-Mule-Deer-Seasons-Quotas-FINAL.pdf
- Harvest: *2025 Nevada Big Game Hunt Data* workbook — https://www.ndow.org/wp-content/uploads/2026/03/2025-Nevada-Big-Game-Hunt-Data.xlsx

## Hunt-unit map layer (NDOW official, public)

- Item: "NDOW Hunt Units" (owner NDOW_DEV, public; "the current active hunting units that the Nevada Department of Wildlife uses"), item id 63f5d9da297f4422a646cd8bdf8cd9a5
- Layer: `https://services.arcgis.com/RyxlXSfFi87rAosq/arcgis/rest/services/NDOW_Hunt_Units/FeatureServer/0`
- Query URL: `https://services.arcgis.com/RyxlXSfFi87rAosq/arcgis/rest/services/NDOW_Hunt_Units/FeatureServer/0/query`
- Unit-id field: `display_name` (esriFieldTypeString, length 50). Values are **3-digit zero-padded strings** ("011", "061", "221"), the same spelling NDOW uses in unit groups, so query with quotes: `display_name='061'`. Not numbers.
- Other fields: OBJECTID, is_open ("true"/"false"), is_active ("true"), year_activated, year_deactivated, Shape__Area, Shape__Length. Native spatial reference is WGS84 (4326).
- 129 features: 124 numbered units (011 … 291) plus 5 named closed areas (Sheldon NWR, Great Basin NP, Death Valley NP, Nellis AFR/NTS, Indian Springs AFAF). One polygon per unit (no duplicates). Every unit in draw/nv.json `units[]` exists in this layer (checked 2026-10-07).
- An older layer, "NDOW_Hunt_Unit_Boundaries/FeatureServer/3" ("2016 Hunt Unit Boundaries"), also exists. Don't use it.

Working test (2026-10-07):

```
curl "https://services.arcgis.com/RyxlXSfFi87rAosq/arcgis/rest/services/NDOW_Hunt_Units/FeatureServer/0/query?where=display_name%3D%27061%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 feature (Polygon), display_name "061", OBJECTID 42

curl "https://services.arcgis.com/RyxlXSfFi87rAosq/arcgis/rest/services/NDOW_Hunt_Units/FeatureServer/0/query?where=display_name%3D%27221%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
→ FeatureCollection, 1 feature (Polygon), display_name "221", OBJECTID 94
```

(unencoded: `?where=display_name='061'&outFields=*&returnGeometry=true&outSR=4326&f=geojson`)
