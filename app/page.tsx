// The planner IS the product front page now. This route re-exports the planner
// component so "/" renders it directly (no separate landing/beta page).
//
// The previous classic single-page tool that lived here is preserved in git
// history and on the backup branch if its Leaflet map flow is needed later.
export { default } from './planner/page';
