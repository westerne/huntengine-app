# Gap research: missing boundary layers and harvest rules (retry)

Researched 2026-10-07. I used official agency and government sources only: USFWS, USACE Tulsa District, USDOT/BTS (which republishes DoD's installation data), ODFW, SD GFP and the SD state GIS org, the KS Secretary of State, the NV Legislature, the OR Secretary of State, NDGF, CPW and WGFD. No browser was used. I did not try to get around any bot challenge, CAPTCHA or login.

## Part B: boundary layers

### B1. Oklahoma controlled-hunt properties not in ODWC's WMA layer

All three layers below are public ArcGIS Online FeatureServers. I ran a test query with `outSR=4326&f=geojson` on each one, and each returned polygons.

**National wildlife refuges (USFWS, "FWS National Realty Boundaries", owner paul_hoeffler@fws.gov_fws)**
- Layer: `https://services.arcgis.com/QVENGdaPbd4LUkLV/arcgis/rest/services/National_Wildlife_Refuge_System_Boundaries/FeatureServer/0` (layer name `FWSBoundaries`)
- Join field: `ORGNAME` (uppercase full name). Other fields: `ORGCODE`, `RSL_TYPE` (`NWR`), `FWSREGION`.
- Test: `.../FeatureServer/0/query?where=ORGNAME%3D%27WASHITA%20NATIONAL%20WILDLIFE%20REFUGE%27&outFields=ORGNAME,RSL_TYPE&outSR=4326&f=geojson` returned a Polygon.

| ok.json unit | ORGNAME |
|---|---|
| Wichita Mountains NWR | `WICHITA MOUNTAINS WILDLIFE REFUGE` (no "NATIONAL") |
| Deep Fork NWR | `DEEP FORK NATIONAL WILDLIFE REFUGE` |
| Little River NWR | `LITTLE RIVER NATIONAL WILDLIFE REFUGE` |
| Salt Plains NWR | `SALT PLAINS NATIONAL WILDLIFE REFUGE` |
| Salt Plains NWR Wilderness Area | No layer. This is a hunt zone inside the refuge, not designated wilderness. It is not in the FWS wilderness layer (`.../FWSWilderness/FeatureServer/0`, which in OK only has `WICHITA MOUNTAINS WILDERNESS NORTH MOUNTAIN UNIT`). Fall back to the whole refuge. |
| Sequoyah NWR | `SEQUOYAH NATIONAL WILDLIFE REFUGE` |
| Sequoyah NWR, Refuge Islands | No sub-area layer. Fall back to the whole refuge. |
| Tishomingo NWR | `TISHOMINGO NATIONAL WILDLIFE REFUGE`. Don't use `TISHOMINGO NATIONAL FISH HATCHERY` (`RSL_TYPE` = `NFH`). |
| Washita NWR | `WASHITA NATIONAL WILDLIFE REFUGE` |

**Army Corps lakes (USACE Tulsa District "SiteAreaFee", owner USACE_Tulsa)**
- Layer: `https://services8.arcgis.com/GvI5dZtQIoT0Fznq/arcgis/rest/services/SiteAreaFee/FeatureServer/1`. The layer id is **1**, not 0. The service description is "civil works real property fee boundaries for USACE owned property in the Tulsa District".
- Join field: `projID` (short code). `sdsFeatureName` is the lake name.
- Test: `.../FeatureServer/1/query?where=projID%3D%27KAW%27&outFields=sdsFeatureName,projID&outSR=4326&f=geojson` returned a MultiPolygon.
- Note: each polygon is the whole lake's fee land. Hunts limited to parts of a lake ("Copan CoE Parks", "Eufaula CoE Gaines Creek") have no sub-area polygon. USACE's `District_Recreation_Features_SWT` service only has points, lines and parking-lot polygons.

| ok.json unit | projID | sdsFeatureName |
|---|---|---|
| Kaw Lake CoE | `KAW` | KAW LAKE |
| Hugo Lake CoE | `HUGO` | HUGO LAKE |
| Skiatook CoE | `SKIATO` | SKIATOOK LAKE |
| Tenkiller CoE | `TENKIL` | TENKILLER LAKE |
| Texoma CoE | `TEXOMA` | LAKE TEXOMA (`siteIDCode` TEXOMA_TX; the polygon covers both states) |
| Waurika Lake CoE | `WAURIK` | WAURIKA LAKE |
| Oologah Lake CoE | `OOLOGA` | OOLOGAH LAKE |
| Copan CoE Parks | `COPAN` | COPAN LAKE (whole lake) |
| Eufaula CoE Gaines Creek | `EUFAUL` | EUFAULA LAKE (whole lake) |
| Keystone/Heyburn CoE | `KEYSTO` + `HEYBUR` | KEYSTONE LAKE, HEYBURN LAKE (two polygons) |

**McAlester AAP and Camp Gruber (USDOT/BTS NTAD "Military Bases", from DoD's MIRTA data, owner USDOT_BTS)**
- Layer: `https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_Military_Bases/FeatureServer/0`
- Join field: `siteName`. Filter with `stateNameCode='ok'` (lowercase).
- Test: `.../query?where=siteName%3D%27McAlester%20Army%20Ammunition%20Plant%27&outFields=siteName&outSR=4326&f=geojson` returned a Polygon.

| ok.json unit | siteName |
|---|---|
| McAlester AAP | `McAlester Army Ammunition Plant` |
| Camp Gruber Cantonment | `NG Camp Gruber`. This is the whole installation. There is no polygon for just the cantonment. |

### B2. South Dakota hunt units: still no public layer

What I tried:
- GFP's ArcGIS Online hosted org (`services.arcgis.com/jWPBXspaQsJStWX8`, 162 services). I listed every service. The only boundary-like layers are `Deer_Archery_Muzzle_Boundaries` (archery/muzzleloader areas ST1/WR1/ER1), `SeasonClosed` (a statewide closure polygon) and `Harvest_DeerSeasonUnitType` (a table with no geometry). There are no unit polygons.
- GFP's proxied services. `.../Hunting/Harvest_Maps/MapServer` (item "Deer Harvest") returns the same 403 `GWM_0003` as the HuntUnit_Deer/Elk/Antelope_Sheep_Goat services found last time.
- SD state GIS org (`PwrabBhZHUggYYSp`, users gfp.gis.coord, BIT). It has GFP Managed Lands, School and Public Lands, Parks, Waterbodies, counties and PLSS, but no hunt units. The state hub (`gis.sd.gov`, which redirects to the sdbit opendata hub) answers its search API with 401.
- `arcgis.sd.gov` did not respond. `sdgis.sd.gov` and `apps.sd.gov/arcgis` returned 404.

Result: still unverified. The units can only be drawn from GFP's PDF maps, or once GFP makes the HuntUnit services public.

### B3. Oregon 2026 eastern Oregon mule deer hunt areas: FOUND

- Layer: `https://services.arcgis.com/uUvqNMGPm7axC2dD/arcgis/rest/services/MD_HuntAreas/FeatureServer/21`. The layer id is **21**. The item is `4114e1f073f44af78cdfcf05769101c7`, "2026 Mule Deer Hunt Areas / Eastern Oregon Mule Deer Hunt Areas", owner `alexander.vencill_ODFW`, in the State of Oregon's "Oregon ArcGIS Online" org (urlKey `geo`). Access is public.
- Fields: `HuntArea` (e.g. `DG-02`) and `HerdRange` (e.g. `Devils Garden`).
- **Join note:** the layer writes codes with a hyphen (`DG-02`), but or.json writes them without one (`DG02`). Strip the hyphen, or insert one, before you join.
- Coverage: the layer has 43 polygons, and they match or.json's 43 hunt-area codes one to one (AD01 … TC02). No code is missing on either side.
- Test: `.../FeatureServer/21/query?where=HuntArea%3D%27DG-02%27&outFields=HerdRange,HuntArea&outSR=4326&f=geojson` returned a Polygon.
- The same owner also has `HuntAreas_WMUs/FeatureServer/0` ("HuntAreas_identity"), which overlays hunt areas with WMUs for popups. You don't need it for boundaries.

## Part A: harvest-reporting gaps still not verified

- **KS deer and elk.** KDWP pages (`ksoutdoors.gov`, `www.ksoutdoors.gov`) return 403 to both curl and WebFetch. The KS SOS online K.A.R. viewer (`pubs_kar_Regs.aspx`) shows an AWS WAF "Human Verification" page, which I did not bypass. What I could read:
  - The 2022 K.A.R. volume (`https://sos.ks.gov/publications/KAR/2022/2022_KAR_Volumes_Book_5.pdf`). K.A.R. 115-4-2 covers tagging and an optional electronic registration for transport. It has no general big-game check requirement.
  - The Kansas Register for Dec. 12, 2024 (`https://www.sos.ks.gov/publications/Register/Volume-43/Issues/Issue-50/12-12-24-52718.html`). It has the full current K.A.R. 115-25-8 (elk, amended Dec. 27, 2024), and the old "contact department staff within two calendar days" clause is gone.
  - I did not get a current copy of K.A.R. 115-25-9 (deer) or the 2026 permit conditions.
  - I added no rule. I updated the KS summary to say what was found.
- **NE bighorn sheep.** outdoornebraska.gov (the guide page and the bighorn brochure PDF) returns a Cloudflare "Just a moment..." challenge or a 403, which I did not bypass. NGPC's bighorn rules are Commission Orders, not part of 163 NAC. I checked the official `rules.nebraska.gov` API: Title 163 only has administrative chapters 1–11. A search snippet points to a same-day check-station rule ("Section 014.04 Checking"), but I could not open an official copy, so I added nothing.
- **ND pronghorn.** The 2026 pronghorn proclamation text (`https://gf.nd.gov/regulations/pronghorn`) has no check-in or mandatory report rule, only tagging and transport rules. I recorded this in the ND summary and added no rule.

Fixed in harvestReporting.json: CO moose (inspection within 5 business days, plus a report within 30 days if you didn't harvest), WY moose (sample submission in designated areas only; no registration rule), OR sheep and goat (OAR 635-067-0031/-0040), NV sheep and goat (NAC 502.345/502.364) and ND bighorn (plugging). I also restored the OR "$25" penalty, which had been garbled to "5".
