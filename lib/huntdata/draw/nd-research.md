# North Dakota (NDGF) — draw rules and hunting-unit map layers

Checked 2026-10-07 against gf.nd.gov and NDGF's ArcGIS service only.

## DRAW RULES (2026 cycle)

The deer gun, muzzleloader and pronghorn lotteries are weighted bonus-point lotteries. You earn a point each year you apply and miss your first choice, or you can buy a point. With 1–3 points you get 2× your points in extra chances; from 4 points up, extra chances are your points cubed (4 pts = 64). You lose your points when you draw your first choice, and you keep them only if you apply at least every other year [1][2][6]. Elk, moose and bighorn sheep are once-in-a-lifetime lottery licenses. Once you draw one, you can never apply for that species again [3][4]. NDGF does not list those three among the weighted bonus-point lotteries [2]. Elk, moose and pronghorn are residents-only [4][5][7]. Nonresidents can apply for bighorn sheep ($100 fee), but by law no more than one sheep license may go to a nonresident [4]. Nonresidents can get deer gun licenses only from a separate pool of about 1% of the licenses, and they compete only against other nonresidents [1]. Approximate timing: elk, moose and sheep applications are due in late March (Mar 25, 2026), but the sheep lottery is held after Sept 1 surveys. Deer opens in early May and is due early June (Jun 3, 2026). Pronghorn opens mid-July and is due early August (Aug 5, 2026) [2][7].

Sources:
1. 2025 Deer Lottery, ND OUTDOORS Feb 2026 — https://gf.nd.gov/magazine/2026/feb/2025-deer-drawing (how weighting works; 1% nonresident pool)
2. Hunting Lotteries — https://gf.nd.gov/hunting/lotteries (says "weighted" lotteries are deer gun, muzzleloader deer, pronghorn, swan, turkey); schedule https://gf.nd.gov/licensing/lotteries/approximate-schedule
3. Elk, Moose, Bighorn Sheep Applications Online — https://gf.nd.gov/news/9083 (once-in-a-lifetime, deadline Mar 25)
4. 2026 Bighorn Sheep, Elk, Moose Proclamation — https://gf.nd.gov/regulations/moose-elk-sheep ("Who May Apply (Bighorn Sheep)": residents and nonresidents; ≤1 nonresident license, N.D.C.C. 20.1-08-04.1); 2026 guide PDF https://gf.nd.gov/gnf/regulations/docs/bgh/Moose-Elk-Sheep-2026-guide.pdf ("Nonresidents can apply for only a bighorn sheep license")
5. 2026 Pronghorn Season Set — https://gf.nd.gov/news/9513 ("Only North Dakota residents are eligible to apply")
6. Lotteries Help — https://gf.nd.gov/buy-apply/help/lottery (bonus point purchase; party uses lowest points)
7. Species pages https://gf.nd.gov/hunting/{elk,moose,bighorn-sheep,deer,pronghorn} (resident-only flags; 2026 application deadlines)

Nonresident eligibility by species: DEER yes (gun lottery ~1% pool; bow licenses are not a lottery for most), ANTELOPE no, ELK no, MOOSE no, BIGHORNSHEEP yes (at most 1 license).

## Hunting-unit map layers (NDGF ArcGIS)

NDGF's species pages link ArcGIS web maps on ndgf.maps.arcgis.com. The web map "Deer Hunting Units" is owned by an NDGF account (bhosek@nd.gov_ndgf). Its layers come from NDGF's `GNF_GeneralInformation` MapServer, which runs on the State of North Dakota GIS hub:

`https://ndgishub.nd.gov/arcgis/rest/services/Applications/GNF_GeneralInformation/MapServer/<layer>/query`

Each species has its own layer. The unit-id field is `UNIT_ID` (string) in every layer. maxRecordCount is 1000.

| Species | Layer | Features | UNIT_ID format | Notes |
|---|---|---|---|---|
| DEER | 33 "Deer Units" | 38 | `1`, `2A`, `2F1`, `3F2`, `4A` (same as lottery) | also `REGION`, `ACRES`. No polygon for `MUZ` (the statewide muzzleloader season). |
| ANTELOPE | 43 "Pronghorn Units" | 18 | `1-A`, `4-C`, `17-A` (hyphen, no leading zero) | The lottery prints `01A`; nd.json `unit` uses the layer spelling. |
| ELK | 34 "Elk Units" | 8 | `E1E`, `E1W`, `E2`…`E7` | `E5` has no lottery licenses (any lottery holder may hunt it). |
| MOOSE | 38 "Moose Units" | 6 | `M5`, `M6`, `M8`, `M9`, `M10`, `M11` | also `SQMILES` |
| BIGHORNSHEEP | 29 "Bighorn Sheep Units" | 5 | `B1`…`B5` | Applicants apply statewide; nd.json row is `STATEWIDE` with `units: B1–B5`. |

Curl tests (run 2026-10-07; each returned 1 Polygon feature):

```
B=https://ndgishub.nd.gov/arcgis/rest/services/Applications/GNF_GeneralInformation/MapServer
curl "$B/33/query?where=UNIT_ID='4A'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"    # 1 feature (REGION Badlands)
curl "$B/33/query?where=UNIT_ID='3F2'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"   # 1 feature (REGION Slope)
curl "$B/43/query?where=UNIT_ID='1-A'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"   # 1
curl "$B/43/query?where=UNIT_ID='17-A'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"  # 1
curl "$B/34/query?where=UNIT_ID='E1E'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"   # 1
curl "$B/34/query?where=UNIT_ID='E3'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"    # 1
curl "$B/38/query?where=UNIT_ID='M10'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"   # 1
curl "$B/38/query?where=UNIT_ID='M5'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"    # 1
curl "$B/29/query?where=UNIT_ID='B1'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"    # 1
curl "$B/29/query?where=UNIT_ID='B4'&outFields=*&returnGeometry=true&outSR=4326&f=geojson"    # 1
```

(URL-encode the quotes and `=` as `%27` and `%3D` if your client needs it.) Every `unit` in nd.json for deer (except `MUZ`), pronghorn, elk and moose exists in its layer.

## Data notes

- Draw: 2026 lottery statistics pages (`https://gf.nd.gov/licensing/lotteries/summary/<species>`) are HTML tables, not PDFs. Deer and pronghorn have per-point first-choice successful/total counts. Elk and moose have only licenses available and applicants. Sheep has one statewide line per year.
- Harvest: NDGF posts unit-level harvest only for elk and moose (news release "2025 Big 3 Harvest Statistics"). Deer and pronghorn are statewide by license type only (news release and Aug–Sept 2026 outlook).
