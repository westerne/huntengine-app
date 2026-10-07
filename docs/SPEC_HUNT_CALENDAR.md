# Spec: My Hunt Calendar (replaces the hunter's spreadsheet)

Status: draft for review, 2026-10-07. Target: January 2027 launch (onboarding + calendar + compare); unit deep dive by April.

## The problem
Hunters plan years ahead in a spreadsheet: points by state, the units they plan to hunt and in which year, a bucket list they hope to fit in, and over-the-counter (OTC) hunts they can always fall back on. HuntQuarters today plans one hunt at a time. The spreadsheet stays the real tool.

**Goal:** a member can drop their spreadsheet and run their hunting years from HuntQuarters, more easily, and find new units along the way.

## 1. The calendar (the core screen)
A multi-year view, this year plus about 5–10 years ahead, one row per year.

Each year shows:
- **Planned hunts:** draw targets placed in that year, OTC hunts, and bucket-list attempts.
- **Point actions:** apply, buy a point only, or skip, per state and species.
- **Flags:**
  - overlapping season dates
  - verified waiting periods and once-in-a-lifetime rules
  - an empty year, with OTC suggestions to fill it

The current year's row becomes this year's **application plan**, which feeds the existing workflow (decide → checklist → submit → draw result → hunt plan → report). Deadlines and reminders come from there.

### Items on the calendar
| Kind | What it is | Year |
|---|---|---|
| Target | A specific unit or hunt you're building toward | You set it, or accept the app's suggestion |
| Bucket list | A hunt you want "someday" (e.g. AK Dall sheep, AZ elk) | Open; the app shows the earliest realistic year and what to do now |
| OTC | A no-draw hunt you can always fall back on | Any year with room |

### Points ledger
- Points per state and species, entered once (or imported).
- Projected forward: +1 for each year you apply or buy a point, back to 0 the year you draw.
- Uses only rules from the state's verified research notes (e.g. OR resets on drawing your first choice; NV loses points after skipping two years in a row).

### "When can I realistically draw?"
Honest estimates only, always shown as a range with a "based on last year's draw" note:
- **Preference/bonus states with point tables** (OR, NV, SD, AZ, NE, ND, WY, CO, ID, MT where available): the points that drew last year, compared with your projected points.
- **Random draws or overall-odds-only data** (NM, ID random, CA, WA, OK, AK): "about X% chance of drawing at least once in N years if odds stay the same". The math is 1 − (1 − p)^N.
- **No data:** say so.
- Never promise a year. Point creep is mentioned whenever the data shows applicant numbers rising.

## 2. Onboarding (fills the calendar on day one)
1. **Import your spreadsheet**, as a CSV upload or a pasted copy.
   - Columns are matched by name, and the hunter confirms the matches: state, species, points, unit or hunt, planned year, notes, category (target, bucket list, OTC).
   - Anything that doesn't match is shown for the hunter to fix. Nothing is guessed silently.
2. **Short survey, mostly taps:**
   - home state, weapons, fitness, budget
   - units you've hunted, and how well you know each
   - what you're after: return to known units, new units, a new state, a new species
   - how long you're willing to wait
3. **Result:** a filled-in calendar, plus 3–5 suggestions ("units like ones you've hunted", "a state worth starting points in", "OTC options for open years").

## 3. Compare units
Pick 2–4 hunts or units and see them side by side:
- odds at your points, with how reliable that number is
- realistic draw year
- hunter success, with sample size
- public land share
- trophy data (only where real data exists)
- season dates
- cost (once fees are researched)
- your own notes and past reports

The app's recommendation and its tradeoffs lead; the full table sits below for anyone who wants detail. Any hunt in the comparison can be added to the calendar with one tap.

## 4. Unit deep dive after you draw (by April)
Runs when you ask, for a drawn or targeted unit. It searches public web sources:
- forums
- agency biologist and harvest reports
- local news on fires, closures, winterkill and access
- articles

What it returns:
- **Themes, not quotes:** pressure, access problems, road and trail conditions, herd condition, weather patterns.
- **Every claim linked** to its source and date; old posts are labeled as old.
- **Kept apart from agency data:** it's what hunters are saying, labeled that way.

**Never:** specific spots, GPS points or "glass this drainage" details, even if a post contains them. Never pages behind a login, and it follows each site's rules for automated access.

Findings flow into Your Hunt Plan and the printed packet. It's a member feature with a per-member usage limit (it costs money per run).

## Data and build notes
- **New table `plan_items`:** user, state, species, unit, hunt_code, kind (target / bucket / otc), target_year, notes. Owner-only security, like the other tables.
- **Reuse:** `hunter_points` (add the year each balance applies to) and `saved_hunts`. When a plan item's year comes up, it becomes a saved hunt in My Season.
- **Fees:** researched later from agency sources only, the same way as the draw rules. Until then, cost is left blank and never estimated.

## Order
1. Calendar + points ledger + import (December)
2. Survey + suggestions (December–January)
3. Compare view (January)
4. Email reminders for deadlines and draw results (February)
5. Unit deep dive (April)

## Open questions for the owner
- How many years ahead should the calendar show by default: 5, or 10?
- Should the calendar plan for a hunting partner too (party applications), or is that later?
- Which bucket-list hunts should we be sure the app handles well (e.g. sheep, AZ elk, AK moose)?
