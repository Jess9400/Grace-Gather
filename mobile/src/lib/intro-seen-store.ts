// On the web the intro mark lives in the browser's storage, per account:
// "due" once onboarding finishes, "yes" once the walk has been shown. Phones
// use intro-seen-store.native.ts. If the browser keeps no storage (private
// mode), the walk is simply not shown.
export type IntroMark = "due" | "yes" | null;
const key = (account: string) => `intro_seen_${account}`;
export async function readIntroMark(account: string): Promise<IntroMark> {
  try {
    const value = globalThis.localStorage?.getItem(key(account));
    return value === "due" || value === "yes" ? value : null;
  } catch {
    return null;
  }
}
export async function writeIntroMark(account: string, mark: "due" | "yes") {
  try {
    globalThis.localStorage?.setItem(key(account), mark);
  } catch {
    // Not kept in this browser; nothing else depends on it.
  }
}
