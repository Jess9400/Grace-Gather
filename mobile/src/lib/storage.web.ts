const memory = new Map<string, string>();
export const persistent = false;
export async function initialize() {}
export async function getItem(key: string) {
  return memory.get(key) ?? null;
}
export async function setItem(key: string, value: string) {
  memory.set(key, value);
}
export async function removeItem(key: string) {
  memory.delete(key);
}
export async function protectAudio(_uri: string, _id: string): Promise<string> {
  throw new Error("Use the iPhone app for encrypted audio.");
}
export async function playableAudio(_id: string): Promise<string> {
  throw new Error("Use the iPhone app for encrypted audio.");
}
export function clearPlayback() {}
export async function removeAudio(_id: string) {}
export async function clearVault() {
  memory.clear();
}
export async function exportEncrypted(): Promise<{ uri: string; key: string }> {
  throw new Error("Backups are available in the iPhone app.");
}
export async function restoreEncrypted(_uri: string, _key: string) {
  throw new Error("Restore is available in the iPhone app.");
}
