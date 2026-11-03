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
// Utah followed on the same measurement: its adapter returns the same hunts
// as HUNT_DATA, name for name, across all five species it covers. The data is
// thin (12 deer, 11 elk) but it was thin before, so nothing was traded away.
//
// Wyoming is the last one, and what holds it is now features rather than data.
// Both earlier blockers are gone: hunts publishing only the fewest points that
// drew are rankable, and the planner no longer offers Wyoming moose, sheep or
// goat, which were description-only rows with no draw data behind them — so
// the adapter's deer, elk and antelope is the whole list.
//
// What remains is hand-tuned behaviour the generic builder has no equivalent
// for: the deer-region resolver, the antelope type codes, and the special-draw
// toggle. Moving Wyoming means porting those, not loading data.
//
// This lives on its own rather than in registry.ts, which pulls in every
// state's draw data — a route importing it for one constant got an undefined
// at request time.
export const HAND_BUILT_SCOUT_STATES: readonly string[] = ['WYOMING'];
