# Architecture plan: built around the hunter's year

Status: draft for review, 2026-11-04. Applies the design system (docs/BRAND.md) to a new structure. No logic or data is thrown away; screens and records are reorganized.

## 1. How a hunter actually uses this

A western, multi-state hunter's year has a rhythm. The app should know where they are in it.

| When | What they're doing | What they need from us |
|---|---|---|
| **Nov – Jun** · application season | Deciding per state: apply, buy points, or skip; hitting rolling deadlines (AK Dec, WY Jan–May, AZ Feb, NM Mar, CO/UT/MT Apr, NV May, ID Jun…) | What to apply for and why, deadlines in order, a reminder before each one, points at a glance |
| **Feb – Jul** · results | Draw results land state by state | "Results are out — did you draw?" in one tap; what to do if not (leftovers, second draws, OTC) |
| **Jun – Aug** · leftovers & OTC | Filling gaps | Leftover/OTC options that fit their year |
| **Jul – Sep** · prep | Scouting, e-scouting, gear, fitness, logistics | Everything about *this* unit in one place: plan, gear, unit deep dive, maps, packet |
| **Aug – Dec** · the hunt | In the field, often offline | The printed/offline packet, regs, notes |
| **After** | Official harvest report (legally required in many states), their own notes | The official reminder and link, a quick personal report, lessons kept for next time |
| **Anytime** · dreaming | Evenings and off-season: new states, units, bucket list | Discovery, compare, "what could I draw if…" |

Three usage moments drive the design:
1. **"What do I need to do now?"** — the most common open. The home screen must answer it for *this week*.
2. **Planning & discovery sessions** — long, sit-down, mostly winter.
3. **Quick logging** — record a result, update points, add a tag, jot a note. Should take seconds.

## 2. One record, one lifecycle

Today a hunt is split across `plan_items` (calendar) and `saved_hunts` (My Season). To a hunter it's one thing that moves through stages:

```
Idea ─▶ Planned (a year) ─▶ Applied ─▶ Drew ─▶ Prepping ─▶ Hunted ─▶ Reported
  │                            │ └▶ Didn't draw (points +1, kept in history)
  └ bucket list (no year)      └▶ Points only / Skipped
OTC / leftover tags enter at "Drew" (tag in hand).
```

**Recommendation:** merge into one "My hunt" record (state, species, hunt, year or none, stage, result) with applications, tasks, plans, reports and notes hanging off it. The calendar, the season view and history become *views* of the same records.

Separate from that, a **Hunt** is the reference data for a state hunt code (odds, harvest, map, season, rules) — what Find shows and what every My hunt links to.

## 3. Navigation (bottom tabs on phones, header on desktop)

| Tab | Purpose | Replaces |
|---|---|---|
| **Today** (home) | Season-aware: what to do this week, next hunt countdown, results to record, reports owed, points at a glance | My Season's "Next up" |
| **Plan** | One timeline from past seasons to five years out: this season's applications, years ahead, bucket list, OTC pool, points ledger. Past years = history | My Calendar, My Season, My History |
| **＋** | Quick actions sheet: record a draw result · add a tag I drew/bought · update points · add a hunt to my plan · write a hunt report · add a note | scattered buttons |
| **Find** | Discover by state/species/your points, results, compare tray, Hunt pages | Find a Hunt, Compare, unit briefs |
| **Me** | Profile & home state, points (also in Plan), reminders, membership, theme, import | My Profile |

## 4. Key screens

**Today** — leads with one card: the most urgent thing ("NM deadline in 6 days — 2 hunts to submit"). Below: this week's list, next hunt countdown, results expected soon, points summary. Content changes with the season *because it's driven by real dates* (deadlines, results dates, hunt dates), not by the month.

**Plan** — vertical timeline. This season expanded (each state: apply / points / skip, deadline, status). Future years collapsed to a line each ("2029 · WY elk 125 · AZ elk points"). Past seasons below with results and reports. Points ledger as the PointsTimeline per state.

**My hunt** (one per hunt-year) — a stage bar across the top (Planned → Applied → Drew → Prep → Hunted → Reported) and *one* primary next action. Sections appear by stage: Application → Result → Prep (plan, gear, deep dive, packet) → Report → Notes. Links to its Hunt page.

**Hunt page** (Find) — the reference for a hunt code: big number = odds at your points with a Confidence meter, PointsTimeline vs last draw, hunter success, public land, season, map, rules, official links. Actions: Add to plan · Compare. After drawing, the unit deep dive lives here too.

**Find** — search → ranked results (one pick + alternatives, as now) → compare tray (up to 4) → Hunt page.

## 5. Routes

| New | From |
|---|---|
| `/` (signed in) → `/today` | `/season` home |
| `/plan` | `/calendar`, `/season`, `/history` |
| `/my/[id]` (My hunt) · `/my/[id]/packet` | `/season/[id]`, `/season/[id]/print` |
| `/find` · `/find/compare` · `/find/[state]/[species]/[code]` | `/planner`, `/compare`, unit briefs |
| `/me` · `/me/import` | `/profile`, `/calendar/import` |
| `/start` | `/calendar/setup` |

Old URLs redirect, so nothing saved breaks.

## 6. Reminders (the part that brings people back)
Email (opt-in, per type): deadline in 7 days and 1 day · results expected ("did you draw?") · hunt in 30/7 days · official harvest report due · draw-result follow-up ("didn't draw — leftover options"). Driven by the same dates as Today.

## 7. Build order
1. **Shell + Today + Plan** on the design system; redirects. (Biggest visible change.)
2. **My hunt** stage page; merge plan items and saved hunts into one record (migration + backfill).
3. **Find + Hunt page + Compare** restyled; unit briefs become Hunt pages.
4. **＋ sheet, Me, Start (setup) restyle**; email reminders.
5. **Unit deep dive** on Hunt pages (by April).

## Decisions (owner, 2026-11-04)
1. Home screen: **open**. Build Today and Plan; picking the home is a one-line route change.
2. History lives as **past seasons inside Plan** (no separate tab). So the tabs are Today · Plan · ＋ · Find · Me.
3. **Merge** calendar items and saved hunts into one "My hunt" record that moves through stages.
