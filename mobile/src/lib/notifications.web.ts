import { Language } from "./content";
export async function enableReminder(_language: Language) {
  throw new Error("Reminders are available in the iPhone app.");
}
export async function disableReminder() {}
export async function remindersEnabled() {
  return false;
}
export async function registerGatheringPush() {
  throw new Error("Push notifications are available in the iPhone app.");
}

export async function disableGatheringPush() {}
export async function registerModeratorPush() { throw new Error("Phone alerts are available in the iPhone app."); }
export async function disableModeratorPush() {}
export async function moderatorPushEnabled() { return false; }
export async function forgetModeratorPush() {}
