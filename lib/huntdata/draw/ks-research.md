# Kansas — draw rules & deer-unit map layer (research notes)

Researched 2026-10-07. KDWP sources only (ksoutdoors.gov and KDWP's own ArcGIS Online org, owner `KDWP_GIS`).

Access note: ksoutdoors.com redirects to www.ksoutdoors.gov. The site's CDN answers **curl** with
HTTP 403 "Access Denied", but Node 18+ `fetch` and a normal browser are served the pages and PDFs
directly (no challenge page). Nothing was bypassed; the build scripts use Node `fetch` and stop if refused.

Data files: `draw/ks.json` (2026 deer + antelope draw, `scripts/draw/buildKSDraw.mjs`),
`harvest/ks.json` (2024-25 elk only, `scripts/harvest/buildKSHarvest.mjs`).

---

## PART 1 — DRAW RULES (2026 cycle)

Facts:
- **Deer, nonresident:** every nonresident deer permit is drawn. 2026 application window was **April 1–24, 2026**
  (online at GoOutdoorsKS or by phone). You must already **hold a nonresident Kansas hunting license** when you
  apply ($125 age 16+, $40 youth; license and $25 application fee are nonrefundable). The Nonresident
  White-tailed Deer Permit ($475 incl. the application fee) covers one whitetail of either sex plus one
  antlerless whitetail. You pick one unit plus one adjacent unit and one season (archery, muzzleloader or
  firearm). [Deer page]
- **Points (deer):** preference points, highest points first. If you don't draw you get a point; you can also buy
  a point only ($25 nonresident, $10 resident) during the application window. Points are lost after 5 years with
  no application or point purchase. Groups of up to 5 (same unit, same season) are drawn at the **lowest** point
  level in the group. Points are used only in the nonresident deer draw and the resident deer/antelope draws.
  [Deer page; antelope page]
- **Mule deer (nonresident):** a separate **$150 Mule Deer Stamp** draw for nonresidents who drew an archery or
  muzzleloader whitetail permit in Units 1, 2, 17 or 18; points do **not** count (79 stamps in 2026). [Deer page]
- **Deer, resident:** most resident permits are over the counter Aug 5–Dec 31 (any-season whitetail, archery and
  muzzleloader either-species, antlerless). Only the **Resident Firearm Either-species/Either-sex** permit is drawn
  (West units 1, 2, 17, 18 or East units 3, 4, 5, 7, 16), application **May 12–June 12, 2026**. [Deer page]
- **Antelope:** firearm and muzzleloader permits are **resident-only** draws by preference points (May 12–June 12,
  2026); half go to landowner/tenants and half to general residents (state law, per the 2024 pronghorn report).
  Archery antelope is over the counter for residents and nonresidents. [Antelope page]
- **Elk:** **residents only** (plus qualifying nonresident tenants). Fort Riley (Unit 2 / Sub-unit 2A) permits are a
  draw with **bonus points** (one extra chance per point), application May 12–June 12, 2026; Unit 3 is over the
  counter. Fort Riley any-elk is once in a lifetime; Fort Riley antlerless once every 5 years. KDWP publishes no
  per-hunt elk draw statistics. [Elk page; 2024-25 Elk Harvest Report p.2]
- **All hunters** born on or after July 1, 1957 must be hunter-education certified. [Deer page]

**DRAW RULES (KS):**
> Kansas draws nonresident deer permits by preference points: the highest point holders draw first, you earn a point
> each year you miss (or can buy one), and points expire after five years without applying. Nonresidents must
> already hold a Kansas nonresident hunting license when they apply in April (April 1–24 in 2026), and they pick one
> unit plus one adjacent unit and one season (archery, muzzleloader or firearm). The $475 whitetail permit covers
> one whitetail of either sex plus one antlerless whitetail; a separate mule deer stamp is a random draw only for
> archery or muzzleloader permits in Units 1, 2, 17 and 18. Most resident deer permits are bought over the counter,
> but the resident firearm either-species permit, antelope rifle and muzzleloader permits, and Fort Riley elk
> (residents only, bonus points) are drawn from applications taken May 12–June 12.

Citations:
- Deer: https://www.ksoutdoors.gov/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/deer
- Deer quotas & draw statistics (data source): https://www.ksoutdoors.gov/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/deer/deer-quotas-and-draw-statistics
- Antelope (rules + 2026 draw statistics): https://www.ksoutdoors.gov/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/antelope
- Elk: https://www.ksoutdoors.gov/outdoor-activities/hunting-in-kansas/what-to-hunt/big-game/elk
- 2024-25 Elk Harvest Report (PDF): https://www.ksoutdoors.gov/home/showpublisheddocument/1396/638967132842170000
- 2024 Pronghorn Harvest Report (PDF): https://www.ksoutdoors.gov/home/showpublisheddocument/968/638956046306330000
- 2025 Nonresident Deer Draw Stats Report (PDF, same figures as the 2025 HTML section): https://www.ksoutdoors.gov/home/showpublisheddocument/402/639166787245928848

---

## PART 2 — DEER MANAGEMENT UNIT LAYER (KDWP ArcGIS)

- Item: "Kansas Deer Management Units", owner **KDWP_GIS** (KDWP's ArcGIS Online org `q2CglofYX6ACNEeu`), public,
  item id `e31157c99ff647858d1a21da681035ec` (item modified 2026-09-04; layer data last edited 2026-04-14).
- Query URL: `https://services1.arcgis.com/q2CglofYX6ACNEeu/arcgis/rest/services/Kansas_Deer_Management_Units/FeatureServer/0/query`
- Unit-id field: **`DMU`** (string). Format: **`UNIT <n>`** — upper case, one space, no leading zero:
  `"UNIT 1"` … `"UNIT 18"`. 18 polygons (one per unit). Draw-file unit `"16"` ↔ `DMU = 'UNIT 16'`.
  Other fields: `OBJECTID`, `AreaSQMile`, `Shape__Area`, `Shape__Length`. Native SR 3857; ask for `outSR=4326`.
- Not in this layer: **Unit 19** (urban; separate layer `DMU_19_Urban/FeatureServer/0`, field `unit` = 19,
  `Name` = "Unit 19 - Urban"), Sub-units 8A (Fort Riley) and 10A (Fort Leavenworth). None of these have draw rows.
- Test (both return a FeatureCollection with **1 feature**, a Polygon, run 2026-10-07):

```
curl "https://services1.arcgis.com/q2CglofYX6ACNEeu/arcgis/rest/services/Kansas_Deer_Management_Units/FeatureServer/0/query?where=DMU%3D%27UNIT%2016%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
  → 1 feature, DMU "UNIT 16", Polygon (1,450-vertex outer ring), ~54 KB
curl "https://services1.arcgis.com/q2CglofYX6ACNEeu/arcgis/rest/services/Kansas_Deer_Management_Units/FeatureServer/0/query?where=DMU%3D%27UNIT%201%27&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
  → 1 feature, DMU "UNIT 1", Polygon (2,488-vertex outer ring), ~92 KB
```
  (Unencoded: `?where=DMU='UNIT 16'&outFields=*&returnGeometry=true&outSR=4326&f=geojson`.
  `?where=1=1&returnCountOnly=true&f=json` → `{"count":18}`.)

Related KDWP layers (same org):
- Antelope firearm/muzzleloader units: `Pronghorn_Rifle_Units_shp/FeatureServer/0`, field `DMU` = "UNIT 2" / "UNIT 17" /
  "UNIT 18" (same polygons as the deer units). Archery: `Pronghorn_Archery_Unit/FeatureServer/0` (one polygon, "Archery Unit").
- Elk units: `Elk_Units/FeatureServer/0`, field `Elk_Unit` = "Unit 1" / "Unit 2" / "Unit 3" (title case). No Fort Riley
  (2A) polygon.
- `KS_DMU/FeatureServer/0` (owner jjones_KDWPT) is a duplicate of the deer units with the same `DMU` values; prefer
  the KDWP_GIS layer above.
