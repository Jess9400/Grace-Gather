import * as SecureStore from "expo-secure-store";

// A plain per-account mark, kept outside the journal's encrypted store so it
// can be read before that store has opened: "due" once onboarding finishes,
// "yes" once the walk has been shown. Keys allow letters, digits, ".", "-"
// and "_" only.
export type IntroMark = "due" | "yes" | null;
const key = (account: string) => `intro_seen_${account.replace(/[^\w.-]/g, "_")}`;
export async function readIntroMark(account: string): Promise<IntroMark> {
  const value = await SecureStore.getItemAsync(key(account));
  return value === "due" || value === "yes" ? value : null;
}
export async function writeIntroMark(account: string, mark: "due" | "yes") {
  await SecureStore.setItemAsync(key(account), mark);
}
