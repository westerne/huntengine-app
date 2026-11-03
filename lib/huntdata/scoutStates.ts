// Which states SCOUT still answers from a hand-tuned branch.
//
// Everywhere else the server picks the hunts out of the shared format and the
// model only explains them, so species, weapon and points are enforced rather
// than described in a prompt and hoped for.
//
// Montana moved across once its adapter was measured against the hand-built
// dataset and covered all six species with more hunts in every one. The rest
// are waiting on data or features, not on this list: Colorado has no
// points-to-draw figures yet; Idaho, Utah and Montana carry no weapon on their
// hunts; and Wyoming's branch still holds the special draw and its deer
// regions.
//
// This lives on its own rather than in registry.ts, which pulls in every
// state's draw data — a route importing it for one constant got an undefined
// at request time.
export const HAND_BUILT_SCOUT_STATES: readonly string[] = ['WYOMING', 'IDAHO', 'COLORADO', 'UTAH'];
