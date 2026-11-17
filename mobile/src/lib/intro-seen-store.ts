// On the web the "intro seen" flag lives in the browser's storage, per
// account. Phones use intro-seen-store.native.ts. If the browser keeps no
// storage (private mode), the walk may be offered again; it has Skip.
const key = (account: string) => `intro_seen_${account}`;
export async function readIntroSeen(account: string) {
  try {
    return globalThis.localStorage?.getItem(key(account)) === "yes";
  } catch {
    return false;
  }
}
export async function writeIntroSeen(account: string) {
  try {
    globalThis.localStorage?.setItem(key(account), "yes");
  } catch {
    // Not kept in this browser; nothing else depends on it.
  }
}
