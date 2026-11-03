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
// Left: Idaho and Utah carry no weapon on their hunts, and Wyoming's branch
// still holds the special draw and its deer regions.
//
// This lives on its own rather than in registry.ts, which pulls in every
// state's draw data — a route importing it for one constant got an undefined
// at request time.
export const HAND_BUILT_SCOUT_STATES: readonly string[] = ['WYOMING', 'IDAHO', 'UTAH'];
