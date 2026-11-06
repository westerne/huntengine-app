# Ranking hunts by what the hunter wants, then by whether they can draw it

Status: v1 built 2026-11-05 (`lib/huntdata/fit.ts`, `/api/huntdata/rank`, `app/find/RankedView.tsx`). Owner went with the recommendations in §7: demand counts, antlerless hidden unless asked, general hunts ranked by fit, no trophy in v1.

Built differently from the draft: where only a hunt's overall rate is published and points matter (Colorado), hunts are ranked by fit alone in one list ("Ranked by fit"), because "likely by" would compound a rate that isn't the hunter's. Utah moved out of that list on 2026-11-05: its odds are now modeled from DWR's per-point results (top-points permits, then points + 1 chances; `lib/huntdata/weightedDraw.ts`). Colorado followed the same day (CPW 2026 Post Draw Recap, `lib/huntdata/preferenceDraw.ts`): above the drawn-out level 100%, at it CPW's "x of y", below it zero, except the hybrid draw on about 70 of the hardest elk/deer/pronghorn hunt codes (up to 20% of licenses; in 2026 every winner held 5+ points, spread evenly). Moose, sheep and goat (weighted random draw past 3 points) still rank by fit only. The owner says Colorado's system changes next year; details to be confirmed with CPW. Where the hunter's residency earns no points (Wyoming residents for elk), the overall rate is their chance and they get the three groups.

## 1. The problem
Find starts from what you can draw and only then sorts by what you want (`rankByWants` in `lib/huntdata/wants.ts` narrows the reachable pool). So a cow tag or a crowded general hunt leads the list because it draws, not because it's a hunt anyone would choose. A hunter should first see **the best hunts for them**, and then **what each takes to draw**.

## 2. The idea
Two separate scores, never blended into one number:
- **Fit:** how well a hunt matches the hunter's preferences, from the agency's own figures.
- **Draw:** their chance this year, the chance by a year they choose, and when they'd likely draw (the odds ladder, `lib/huntdata/ladder.ts`).

The result reads as three groups, each ranked by fit:
1. **Draw it now:** good fit, at least a 1-in-5 chance this year.
2. **Worth building toward:** good fit, likely within the hunter's horizon (e.g. by 2032).
3. **Long shots:** great fit, but a small chance even by then. Shown, labeled.

Hunts that fit badly don't appear, however easy they are to draw. That's the fix.

## 3. What fit is made of (v1, only data we have)
Each criterion is scored **against the other hunts for that state and species** (a percentile), because "45% success" means little until you know Nevada elk averages 30%.

| Criterion | From | Coverage |
|---|---|---|
| Hunter success | agency harvest reports | most states |
| Demand: applicants per tag | draw results | most states; a stand-in for quality ("other hunters want this one") |
| Quiet: fewest tags | draw results | most states |
| Weapon | hunt code | all (hard filter) |
| Antlered vs antlerless | hunt label | all (filter) |
| Limited vs general/OTC | hunt data | all |
| Season timing (rut, early, late, my dates) | agency season dates | NV, OK, part of WA |
| Public land % | BLM ownership sample | computed per unit; needs precomputing to rank on |
| **Trophy quality** | — | **only Wyoming's measured entries; not used in v1** |

A criterion with no data for a hunt is **unknown**: it's left out of that hunt's score (not counted as a zero) and shown as "not published". Every score comes with its reasons, e.g. "Top 10% hunter success for Nevada elk · 40 applicants per tag".

## 4. Preferences
Set once on Find (and saved to the profile so the advisor uses them too):
- **Weapon** (any / rifle / archery / muzzleloader): a hard filter.
- **Animal:** antlered only (default), or include antlerless.
- **What matters**, each as Doesn't matter / Nice / Matters most: success, quality (demand), quiet, timing, public land.
- **Horizon:** how many years they'll build points (default 5).

## 5. Where it shows
- **Find:** preferences, then the three groups, each row showing fit reasons + this year's chance + chance by the horizon + a link to the odds ladder page.
- **Advisor:** `search_hunts` returns the same groups and reasons, so "what should I apply for" answers from fit first.
- The free-text step ("describe the hunt you want") stays; it just fills in these preferences.

## 6. Not in v1
Trophy quality beyond Wyoming's measured entries, hunter density per square mile, access and roads. Each needs a data source first; until then the page says it can't rank on them.

## 7. Owner decisions
1. Count **demand (applicants per tag)** as a quality signal? Recommended: yes, labeled "other hunters want this one".
2. **Antlerless and general hunts:** hidden unless asked for (recommended for antlerless), or shown but ranked by fit like everything else (recommended for general)?
3. **Trophy:** ship v1 without it, or source trophy data first (state harvest/antler reports, record books)? The second is a separate data project.
