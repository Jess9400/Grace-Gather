import * as storage from "./storage";

// The church controls (evening light, sound, tour, help) start open on the
// first visit to Home, so a new person sees where they are; afterwards they
// start folded behind the "…" button. Remembered on this device.
const KEY = "church-tools-shown";

// True the first time it is asked on this device; it then remembers.
export async function firstChurchVisit() {
  try {
    if ((await storage.getItem(KEY)) === "yes") return false;
    await storage.setItem(KEY, "yes");
    return true;
  } catch {
    return false;
  }
}
