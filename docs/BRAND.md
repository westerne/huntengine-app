# Brand & design system

Source: the HuntEngine.ai brand board (palette names, mark usage, two-tone wordmark, "Built for the hunt ahead").
Living reference: **/design** (every component, both themes). Tokens: `app/styles/hq.css`. Components: `app/ui/index.tsx` (server-safe) and `app/ui/client.tsx` (interactive). Mark: `public/brand/elk-mark.png` (cut from the board; swap in an SVG when we have one).

## Palette

| Name | Hex | Role in the UI |
|---|---|---|
| Engine Slate | `#2B3F4F` | The brand: header, selected states; deepened (`#16222C`) as the dark-theme background |
| Alpine Mist | `#8DA2B0` | Quiet text in dark, second half of the wordmark, "long shot" (deepened to `#4F6474` on light) |
| Cloud Base | `#F4F6F7` | Light background; text on dark |
| Field Gold | `#E2A53C` | **Only ever "tap this"**: buttons, link underlines (link text `#86571A` on light). The one exception is the mark on dark, per the board |
| Antler Bronze | `#C18C47` | "Fair chance" / caution (`#86571A` on light, `#D4A06A` on dark) |

Plus `--good` (green) and `--stop` (red) for "likely draw" and "not open to you" — always with the word.

## Mark & wordmark
- The elk with its network of points. **Engine Slate on light, Field Gold on dark** (automatic via `--mark`).
- Wordmark is two-tone: first word in Field Gold, the rest in Alpine Mist, wide geometric caps (Montserrat, the closest free match to the board).
- Tagline style: "Built for the hunt ahead."

## The rule: one color, one job
- Odds colors are always paired with a word (`<Tier tier="good" />` → "Likely draw").
- Every text/background pair is AA (4.5:1+) in both themes (checked 2026-11-04). Slate text on Field Gold is 7:1.
- Gold never decorates UI. If it isn't tappable, it isn't gold (the logo is the only exception).

## Type
- **Inter** for words; **Roboto Mono** for numbers and eyebrows; **Montserrat** caps for the wordmark and display lines (`--font-inter`, `--font-hqmono`, `--font-display`).
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
