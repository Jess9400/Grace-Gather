// The church doors greet the person once each time the app starts.
let entered = false;
export function shouldShowEntrance() {
  return !entered;
}
export function markEntered() {
  entered = true;
}
// After the first-visit walk the doors are shown again, even if another
// account already went in during this app session.
export function showEntranceAgain() {
  entered = false;
}

let tourRequested = false;
export function requestChurchTour() {
  tourRequested = true;
}
export function consumeChurchTour() {
  const requested = tourRequested;
  tourRequested = false;
  return requested;
}
// A brand-new member sees the whole tour once, right after the doors, before
// anything else in the church.
let firstTour = false;
export function requestFirstChurchTour() {
  tourRequested = true;
  firstTour = true;
}
export function consumeFirstTour() {
  const first = firstTour;
  firstTour = false;
  return first;
}
