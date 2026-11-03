// Which states SCOUT still answers from a hand-tuned branch.
//
// Everywhere else the server picks the hunts out of the shared format and the
// model only explains them, so species, weapon and points are enforced rather
// than described in a prompt and hoped for.
//
// Each state moves once its adapter is measured against the hand-built one.
// Montana went first: more hunts in all six species. Colorado followed: every
// hunt carries a draw-success figure, the shortlist fills for every species,
// and weapon finally filters (688 elk hunts down to 518 rifle or 52 archery).
// Colorado still has no points-to-draw data, but neither did the hand-built
// set, so nothing was traded away.
//
// Idaho was the easy one: its adapter returns the same rows as the
// hand-built builder, species for species and unit for unit, so only who
// picks changed.
//
// Left:
//   Utah  - the adapter has 12 deer and 11 elk hunts against Colorado's
//           hundreds. Thin either way, but measure before moving it.
//   Wyoming - blocked twice over. Its hunts publish the fewest points that
//           drew rather than a draw-success percentage, so buildShortlist
//           ranks none of them and returns nothing (suggestCalendar works
//           around this with its own byPoints fallback). And the adapter
//           covers deer, elk and antelope only, while SCOUT also answers for
//           moose, sheep and goat from the hand-built data. Both are data
//           jobs, not code.
//
// This lives on its own rather than in registry.ts, which pulls in every
// state's draw data — a route importing it for one constant got an undefined
// at request time.
export const HAND_BUILT_SCOUT_STATES: readonly string[] = ['WYOMING', 'UTAH'];
