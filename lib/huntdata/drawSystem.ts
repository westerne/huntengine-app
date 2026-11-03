// Does clearing a hunt's points cutoff mean you draw it?
//
// In a preference state it does: tags go out in point order, so the fewest
// points that drew last year is a bar, and clearing it is the tag. Everywhere
// else — bonus, squared bonus, random, or a hybrid with a random pool — it only
// buys a ticket. Nevada publishes "7 points drew" for a hunt that gave out 7
// tags to 4,279 applicants, where 1 of the 267 people holding 7 points drew.
// Printing that cutoff as a date tells a hunter to build toward a lottery as
// though it were a plan.
//
// Its own module so the routes and the compare screen share one answer, and so
// the pure draw-reality code can take it as a boolean and stay testable without
// the registry.

import { STATE_INFO } from './registry';
import type { StateCode } from './schema';

export function cutoffIsADate(state: StateCode | string): boolean {
  const info = STATE_INFO[state as StateCode];
  // Unverified draw rules are treated as a lottery rather than trusted.
  return !!info && info.rulesVerified && info.drawSystem === 'preference';
}
