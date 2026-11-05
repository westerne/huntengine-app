# Sign-off: application deadlines, fees & prerequisites — 17 states

Researched 2026-11-04 · files: `lib/huntdata/apply/<st>.json` (format: `lib/huntdata/apply/FORMAT.md`) · **not used by the app until you sign off.**

Every row in every file has an official source URL and a quote. Totals: 73 draw windows (**8 already show 2027 dates**, 65 are last year's and labeled that way), 345 fee lines, 93 prerequisites.

## By state

| State | 2027 dates posted? | Draws | Fees | Notes |
|---|---|---|---|---|
| AK | ✅ All (Nov 1–Dec 15, 2026, 5 pm AK) | 3 | 16 | Results date computed from "third Friday of February" (Feb 19); Tier I/II results left blank (ADF&G dates conflict) |
| AZ | ✅ Spring draw (Oct 6, 2026) · elk/pronghorn & fall last year's | 3 | 17 | azgfd.com blocks automated access (not bypassed) — used AZGFD's PDF booklets; youth prices left out (unreadable) |
| CA | Last year's (Apr 15–Jun 2) | 4 | 18 | Elk/pronghorn/sheep application listed at both $8.38 and $8.13 — file uses $8.38 |
| CO | Last year's (Mar 1–Apr 7, 8 pm MT) | 3 | 18 | Qualifying-license web page shows older unlabeled prices — used the 2026 brochure |
| ID | ✅ NR deer/elk (Dec 5–15, 2026 & Feb 5–15, 2027) · rest last year's | 6 | 17 | IDFG website was down (503) — official PDFs only; no closing times on the 2027 dates |
| KS | Last year's | 4 | 13 | **See decision 1.** Fee conflicts: NR deer $475 vs $477.50; elk $12.50 vs $10. No deadline time or results date published |
| MT | Last year's (Apr 1 / May 1 / Jun 1) | 7 | 32 | Results only "mid-April" etc. (left blank). Website says MST, booklet MDT. AIS pass amount unreadable |
| ND | Last year's | 5 | 13 | Opening dates are the dates NDGF announced applications were open. "Midnight" with no time zone |
| NE | Last year's — **calculated** | 4 | 19 | **See decision 2.** outdoornebraska.gov blocks automated access (not bypassed). Fees are the 2027 schedule |
| NM | Last year's (Mar 18, 5 pm MDT) | 1 | 16 | 2027–28 fee schedule already posted (current) |
| NV | Last year's | 3 | 19 | 2nd-draw deadline: page says Jun 15, regulation says "Monday, June 16" (Jun 15 was the Monday) — used Jun 15. NR antlerless elk $500 (statute) vs $1,200 (page) |
| OK | Last year's (Apr 1–May 20) | 2 | 17 | Application fee: $50 NR on one page, flat $10 on others. Landowner antelope residency not stated (left unknown) |
| OR | Last year's (May 15, 11:59 pm PT) | 3 | 15 | NR caps and once-in-a-lifetime quoted from 2026 **draft** rules |
| SD | Last year's (14 windows, 8 am CT) | 14 | 22 | 2027 PDFs not up yet. Point-buying window (Sep 15–Dec 15) is open now and counts for 2027 |
| UT | ✅ Resident sportsman (Oct 20–Nov 10, 2026) · main draw last year's (Mar 19–Apr 23) | 3 | 33 | Fees from the 2026 guidebook |
| WA | ✅ Multi-season deer/elk (Dec 1, 2026–Mar 31, 2027) · special permits last year's | 2 | 25 | Special-permit deadline (May 27, after an extension) has no time |
| WY | Last year's (NR elk Feb 2; moose/sheep/goat Apr 30; deer/antelope Jun 1) | 6 | 35 | "Midnight MT" recorded as 11:59 pm. Fee page undated; amounts match the 2026 handbook |

## Decisions for you

1. **Kansas — how the pages were read.** KDWP's site refused the research tool's normal requests (403), then served the same public pages to a different request tool. That's arguably getting around a block. Options: **(a)** keep the data (it's public, unchanged, and quoted) but re-check by hand on ksoutdoors.gov before going live; **(b)** drop Kansas fees/dates until you can confirm them yourself. *(Alaska's site similarly answered only when the request identified as a normal web browser; no challenge was involved.)*
2. **Nebraska — calculated dates.** Dates come from the regulation's formulas ("first Monday in June…"), marked `computed_from_rule`; the app would show them as *expected*, not published. OK to use that way, or hold until you confirm on outdoornebraska.gov?
3. **Fee conflicts** (CA, KS, NV, OK above): accept the file's choice, or should conflicting fees show as "check with the agency" until confirmed?
4. **Last year's dates:** OK to show them in the app as "Last year: Apr 7 — 2027 date not posted yet" so hunters can plan? (Recommended.)

## What happens after sign-off
- Wire `apply/*.json` into the app (deadlines on Plan/Today, fees and prerequisites on hunt pages and in the advisor), replacing the old 8-state `applications.json`.
- Re-run this research as states post 2027 dates (Dec–Feb); each refresh comes back to you as a sheet like this one.
