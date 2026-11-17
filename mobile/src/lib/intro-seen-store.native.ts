import * as SecureStore from "expo-secure-store";

// A plain per-account flag, kept outside the journal's encrypted store so it
// can be read before that store has opened. Keys allow letters, digits, ".",
// "-" and "_" only.
const key = (account: string) => `intro_seen_${account.replace(/[^\w.-]/g, "_")}`;
export async function readIntroSeen(account: string) {
  return (await SecureStore.getItemAsync(key(account))) === "yes";
}
export async function writeIntroSeen(account: string) {
  await SecureStore.setItemAsync(key(account), "yes");
}
