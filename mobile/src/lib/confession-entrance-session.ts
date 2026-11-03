// Only a presentation preference, never confession content or account data.
let seen = false;
const key = "grace-gather.confession-entrance-seen";
export function shouldShowEntrance(reducedMotion: boolean, hasDraft: boolean) {
  if (reducedMotion || hasDraft || seen) return false;
  try {
    return (
      typeof window === "undefined" ||
      window.sessionStorage.getItem(key) !== "1"
    );
  } catch {
    return true;
  }
}
export function markEntranceSeen() {
  seen = true;
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
  } catch {
    /* The in-memory preference also works when browser storage is blocked. */
  }
}
