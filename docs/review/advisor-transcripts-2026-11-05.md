# Sign-off: advisor answers before members get it

Run 2026-11-05 against the live model (gpt-4o), test hunter: lives in Wyoming, 6 Nevada elk points, 12 Utah deer points, 3 Colorado elk points. Full run of all 43 questions: `advisor-eval-results.md` (43/43 passed).

**What I checked:** every number, date and rule in these 10 answers against our data files. Anything wrong is fixed in code, not just in this run (see "Fixed while preparing this" at the bottom).

**What I need from you:** for each answer, ✅ fine as is, or a note on what a hunter would think is off. Then one yes/no: turn the advisor on for members.

---

## 1. "When is the Nevada elk deadline?"
> Last year's deadline for Nevada elk was May 13. Tap the button below for a reminder.

Button: *Remind me to check when NV posts its elk deadline*
**Checked:** May 13 is NDOW's 2026 date; 2027 isn't posted, so it says "last year's".
**Your call:** ☐ ✅ ☐ note:

## 2. "How much a year to keep buying elk points in Nevada, Colorado and Wyoming?"
> - Nevada: $169. This includes a $155 combination license and a $10 bonus point fee.
> - Colorado: $129.11. This covers a $104.86 small game license and an $11.49 application fee. The elk point itself is free, but you earn it by applying.
> - Wyoming: $0. Wyoming sells elk points only to non-residents, so there's no point to buy as a resident.

**Checked:** all from your signed-off fee file. Wyoming is right for a resident (the bug you caught earlier).
**Your call:** ☐ ✅ ☐ note:

## 3. "I have about $1,500 a year. Which states should I start buying elk points in?"
> 1. Montana: $30/year. It's the cheapest option for non-residents.
> 2. Colorado: $129.11/year. Points are free, but you earn them by applying.
> 3. Utah: $165/year. Requires a hunting license to buy points.
> Arizona: $175/year. Also requires a hunting license.
>
> Wyoming doesn't sell elk points to residents, and Idaho doesn't use points for elk.
>
> Tradeoff: Higher costs in some states come with better draw odds or hunt quality.

**Checked:** the dollar figures are right (Montana = $10 conservation license + $20 bonus point).
**My concern:** this is the weakest answer. It ranks states by price only, spends about $500 of a $1,500 budget, and the "Tradeoff" line is a claim we can't back up. Is "cheapest first" the advice you'd give, or should it ask what kind of hunt they want first?
**Your call:** ☐ ✅ ☐ note:

## 4. "Should I burn my 6 Nevada elk points on 4161-131 or keep building?"
> Applying for Nevada elk hunt 4161-131 with your 6 points gives you a 0.7% chance this year, if odds stay like 2025's. Applying doesn't burn points unless you draw, so it's not a choice between burning or building. You can apply and still build points. Hunter success was 2 of 7 hunters in 2025, but that's too few to judge.

**Checked:** 0.7% is the squared-bonus model at 6 points; 2 of 7 is NDOW's harvest count.
**Your call:** ☐ ✅ ☐ note:

## 5. "I have 3 Colorado elk points. Any good options?"
> With 3 Colorado elk points, you can draw a bull elk hunt in Unit 48, season 3 rifle, with 100% odds if last year's odds hold. There were 5 applicants per tag, and the hunt had 2 tags available.
>
> Tradeoff: This hunt has limited tags, so competition might be tight.

**Checked:** EM048O3R non-residents drew out below 3 points in 2026, so 3 points drew; 2 tags, 5 applicants per tag.
**My concern:** "competition might be tight" next to "100% odds" contradicts itself. Minor.
**Your call:** ☐ ✅ ☐ note:

## 6. "What should I do next?"
> Consider applying for the Limited-Entry Muzzleloader Buck Deer hunt in the Wasatch Mtns, West (hunt code DB1087) in Utah. With your 12 points, you have a 100% chance of drawing this hunt, based on 2025 data. The hunter success rate was 46.4%.

**Checked:** at 12 non-resident points this hunt is in Utah's top-points pool; 46.4% is DWR's 13 of 29 hunters.
**Your call:** ☐ ✅ ☐ note:

## 7. "I can only get one week off, in October. Which Nevada elk hunt fits that?"
> For a Nevada elk hunt in October, consider the muzzleloader hunt in Units 072 - 074. Last year's season was October 5 to October 21, with a 0.36% chance to draw at your points. Hunter success was 3 of 7 hunters, too few to judge.

Button: *Remember: "I can only get one week off, in October."*
**Checked:** dates, odds and hunter success are all 4156-072's own. Earlier runs gave this hunt another hunt's dates; the check now catches that.
**Your call:** ☐ ✅ ☐ note:

## 8. "Can I draw an Alaska moose tag?"
> You can apply for an Alaska moose tag, but it's a random draw with no points. One option is Unit 21E, Middle Yukon, with a 24% chance if odds stay like last year's. Hunter success there was 64.3%. Nonresidents must hunt with an Alaska-licensed guide. Tradeoff: you can't win the same hunt two years in a row. Next: Apply online by December 15.

**Checked:** DM839 is a nonresident-only guided hunt (in ADF&G's own hunt description), 18 permits for 75 applicants = 24%. The two-years rule and Dec 15 deadline are in the Alaska rules file.
**Your call:** ☐ ✅ ☐ note:

## 9. "Give me GPS coordinates for a good glassing spot in unit 161."
> I can't provide specific GPS coordinates or locations for glassing spots. For detailed information about hunting areas, I recommend checking with local wildlife agencies or using mapping tools that focus on public land access.

**Checked:** no spot-burning, as you asked.
**My concern:** it could offer what we can do (the unit's hunts, odds, public land share) instead of just declining. Your preference?
**Your call:** ☐ ✅ ☐ note:

## 10. "Add Nevada elk 4151-111-Early for 2028 to my plan."
> Tap the button below to add it.

Button: *Add NV elk 4151-111-Early for 2028 to my plan* (nothing is saved until the hunter taps it)
**Your call:** ☐ ✅ ☐ note:

---

## Fixed while preparing this
- A percentage or date said about a hunt must be that hunt's own (it had given 4156-072 another hunt's 63% hunter success, then another hunt's season dates).
- "The muzzleloader hunt in Units 072 - 074" narrows to the muzzleloader hunt, not every hunt in the unit.
- A fit score can't pass as a percentage ("hunter success was 76%" was the fit score).
- Words like "high hunter success" need the number behind them; with none published it says so.
- Nevada "burn or build" now explains applying earns the point (stated in the hunt lookup itself).
- Season months are worked out in code, so "a week in October" matches an Oct 22 – Nov 5 season.
- A button mention that doesn't match the button shown is removed.
- A named hunt code is always looked up ("9999-999" now gets "we couldn't find it" instead of a guess).

## Decision
☐ Turn the advisor on for members  ☐ Not yet — fix my notes first
