// The church doors greet the person once each time the app starts.
let entered = false;
export function shouldShowEntrance() {
  return !entered;
}
export function markEntered() {
  entered = true;
}
