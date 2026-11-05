# The advisor: a conversation that helps hunters decide

Status: draft for review, 2026-11-05. Builds on docs/SPEC_ARCHITECTURE.md (the journey), docs/SPEC_KNOWLEDGE.md (what it knows, §E tools) and docs/BRAND.md (voice).

## 1. Why it exists
Screens answer "what are the odds of hunt X". The advisor answers the questions a filter can't:
- "Should I burn my 6 Nevada elk points on 4161-131 or keep building?"
- "I have about $1,500 a year. Which new states should I start buying points in?"
- "I've got one week off in October. What can I actually hunt this year?"
- "I drew. What do I do between now and opening day?"
- "Why didn't I draw, and what should I change next year?"

It's the difference we're betting on, so it has to be **right** before it's clever.

## 2. Rules it never breaks
1. **Answers from tools, never memory.** Odds, points, dates, fees, rules and success rates come only from tool results. If no tool has it, it says "we don't have that" and points to the agency.
2. **Shows its sources.** Every number in an answer is traceable: under the answer, a "Based on" line lists what it used ("NV elk draw results 2026 · your points (6) · NDOW deadlines, last year's date").
3. **Labels what's old.** Last year's date is "last year's", a projection is "if odds stay like last year's", never a promise.
4. **Leads with a decision** (our decision-support principle): one recommendation, the main tradeoff, the next step. Details only if asked.
5. **Asks before it acts.** It can propose adding a hunt to the plan, setting a reminder or saving a fact about you; nothing is written until you tap "Yes".
6. **No spot-burning.** It never names specific spots, trails, GPS points or "where the elk are"; unit-level facts only.
7. **Private.** It sees only your own data. Conversations are yours, owner-only (RLS), deletable.
8. **Short and plain.** A hunter talking to a hunter. 5th-grade-ish reading level, no paragraphs of caveats — one Caveat where it matters.

## 3. Where it lives
- **"Ask" button in the header** on every member screen → opens the advisor as a full-height sheet (phone) / side panel (desktop). The five tabs stay as they are.
- **Context entry points** that start the conversation already pointed at something: "Ask about this hunt" on a hunt page and on Find rows; "Help me decide" on Plan's this-season card; "What now?" on Today when a tag is drawn.
- **Suggested questions** when empty, chosen from the hunter's situation (holds points but nothing planned → "Where should I use my points?"; drew a tag → "What should I do before opening day?").

## 4. What an answer looks like
Layout example only — the numbers below are made up to show the shape, not real NV figures.
```
Keep building — apply for 4161-131 in 2029.            ← the recommendation (bold, one line)
At 6 points you'd have had about a 1-in-8 chance       ← why, with the number
last year; at 8 points the 2026 results put you
over the cutoff.
Tradeoff: two more years of $10 points, and the        ← the tradeoff
cutoff has crept up a point every ~3 years.
Next: buy your NV elk point by the deadline            ← the next step + an action
  [Add a reminder]  [Compare with 4151-111]
Based on: NDOW 2026 draw results · your points (6) · NV deadlines (last year's date, May 13)
```
Odds words use the same Tier words as the screens ("Likely draw", "Long shot"). Numbers use the `--data` style. Action buttons are the only gold.

## 5. Tools (v1)
Each tool is a thin wrapper over a function the screens already use — one source of truth.

| Tool | Returns | Built on |
|---|---|---|
| `my_situation` | home state, points by state/species, plan by year, hunts in progress, upcoming deadlines | `loadPlan`, `buildToday` |
| `search_hunts` | hunts in a state/species reachable at given points, with odds | `drawReality`, `/api/huntdata/narrow` matcher |
| `get_hunt` | one hunt: odds at your points, cutoff, success, public land, season, links | `findHunt`, `compareColumn`, landstats |
| `odds_outlook` | year-by-year chance and points if you keep applying | `drawOutlook`, `projectPoints` |
| `compare_hunts` | 2–4 hunts side by side + the pick and its tradeoff | `compareColumn`, `pickBest` |
| `deadlines` | deadline per state/species with status (posted / expected / last year) and source | `deadlineFor`, `officialInfoFor` |
| `fees_and_rules` | fees, prerequisites (hunter ed, licenses), application link, with sources | `feesFor`, `prerequisitesFor` |
| `harvest_reporting` | official reporting rule for a state/species | `harvestReportingFor` |
| `my_reports` | your past reports' lessons for a state/species | `hunt_reports` |
| **Asks first:** `add_to_plan`, `set_reminder`, `remember` | writes after you tap Yes | existing plan-items / tasks APIs; `remember` → profile memory (§7) |

Not in v1 (the data isn't ready — SPEC_KNOWLEDGE P1/P2): OTC/leftover catalog, trophy potential, land access beyond public-land %, tactics/gear library. When asked, it says so plainly.

## 6. How it runs
- **Server route** `POST /api/advisor` (members only, rate-limited like the other AI routes). Streams the answer.
- **Model:** the provider the app already uses (OpenAI, GPT-4o class), behind one small adapter (`lib/advisor/model.ts`) so the model can be swapped in one file. Tool calling, low temperature.
- **Loop:** model → tool calls (run on the server with the member's own Supabase session, so RLS applies) → model → answer. Max ~6 tool calls per turn.
- **Answer check before it's shown:** every number/date in the final text must appear in a tool result from this turn; if not, the turn is retried once with that flagged, then the number is removed rather than shown. The "Based on" line is built from the tools actually called, not written by the model.
- **Cost guard:** per-member daily cap; short history (last ~10 turns plus a running summary).

## 7. Memory
- Conversations saved per member (`advisor_threads`, `advisor_messages`; owner-only RLS; delete anytime).
- **Facts it learns** ("one week off, in October", "budget about $1,500/yr", "bad knee") are only saved via `remember` after you say Yes, and appear on **Me → What the advisor knows**, where you can edit or delete them. Stored on `profiles.planning.facts`.

## 8. How we'll know it's good (before members see it)
A fixed test set of ~40 real questions across the 17 states with known right answers (from our data), run on every change:
- No invented numbers (the answer check catches 100%).
- Recommendation matches what our data supports in ≥90%.
- Says "we don't have that" when the tool returns nothing, every time.
- Never names a spot.
The owner reviews 10 transcripts before launch.

## 9. Build order
1. Tools as plain functions + tests (no AI yet).
2. `/api/advisor` loop with the answer check; the test set runs against it.
3. The sheet UI (header "Ask", suggested questions, answers with "Based on" and action buttons).
4. Context entry points (hunt page, Find rows, Plan, Today).
5. Memory (`remember`, Me → What the advisor knows). Migration 0008 for threads/messages — you run it.
6. Owner transcript review → turn on for members.

## 10. Open questions for the owner
1. **Daily cap:** 30 questions/day per member to start?
2. **Show the "Based on" line always, or behind a tap?** Recommend: always (it's the trust).
3. **Budget questions:** should it use fees we have to total a yearly cost ("about $1,240/yr for these 4 states")? Recommend yes, labeled "from posted fees, check before you pay".
