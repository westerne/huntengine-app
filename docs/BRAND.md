# HuntQuarters brand & design system — "Timber & Blaze"

Living reference: **/design** (every component, both themes). Tokens: `app/styles/hq.css`. Components: `app/ui/index.tsx` (server-safe) and `app/ui/client.tsx` (interactive).

## The rule: one color, one job

| Role | Light | Dark | Job |
|---|---|---|---|
| Timber `--brand` | `#1E3A2B` | `#7FB08F` | HuntQuarters itself: the mark, selected states, the plan |
| Blaze `--action` | `#C2410C` | `#F97316` | **Only ever "tap this"**: primary buttons, links |
| Data `--data` | `#1E3A2B` | `#F2EBDA` | **Only ever a number**: odds, points, success rates |
| Good `--good` | `#2F6B45` | `#86C49A` | Likely draw |
| Fair `--fair` | `#7F5C0A` | `#E0B84E` | Fair chance, caution, the points cutoff |
| Long `--long` | `#4E5D6C` | `#9FB0C2` | Long shot, neutral info |
| Stop `--stop` | `#B42318` | `#F28B82` | Not open to you, errors |
| Canvas / Surface / Ink | `#F5F1E8` / `#FFF` / `#18211C` | `#0E1511` / `#16201A` / `#ECE6D6` | Page, cards, text |

- Odds colors are **always paired with a word** (`<Tier tier="good" />` → "Likely draw"). Never color alone.
- Every text/background pair is AA (4.5:1+) in both themes (checked 2026-11-04). Recheck if you change a value.
- Blaze never decorates. If it isn't tappable, it isn't blaze.

## Type
- **Inter** for words; **Roboto Mono** for numbers and eyebrows (`--font-inter`, `--font-hqmono`).
- Eyebrow: mono 11px, 0.22em, uppercase, muted. H1 30/800, H2 21/800, H3 16/700, body 16/1.5, small 13.
- The one number a screen is about uses `<BigNumber>` (52px/800, tabular figures). One per card, at most.
- Sentence case everywhere. No all-caps headings, no italics for emphasis.

## Components (use these, don't hand-roll)
`Card` · `Button` / `ButtonLink` (primary, secondary, ghost, danger) · `Chip` · `BigNumber` · `StatRow` · `Tier` · `Confidence` (3-bar data-quality meter) · `Caveat` (info / warn / stop) · `PointsTimeline` · `EmptyState` · `Loader` · `TabBar` · `ThemeToggle` · `Lockup` / `Mark`.

## Layout
- Phone first: one column, max 560px (`--col`), 16px gutters, safe-area insets.
- Bottom tab bar on phones follows the hunter's year: **Plan · Find · + Add · Hunts · Me**. From 900px wide it moves into the header.
- Radii 6 / 10 / 14 px; shadows `--shadow-sm` for cards, `--shadow-md` for floating things.

## Voice
Plain, short, a hunter talking to a hunter. Lead with the answer, then one tradeoff, then the next step. Details on tap.
- ✅ "You clear last draw's 5-point cutoff in 2029."
- ✅ "Residents only — South Dakota elk isn't open to non-residents."
- ❌ Paragraphs of caveats on every card. Say a limitation **once**, in a `Caveat`, where it matters.

## Honesty rules (unchanged)
Never invent odds, dates, fees, rules or trophy figures. When data is thin, the `Confidence` meter and a single `Caveat` say so.

## The mark
A ridgeline under a rising blaze sun on timber — first light on opening morning. `<Mark />`, `<Lockup />`.
