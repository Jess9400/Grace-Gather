import { createWebVault } from "./web-vault";
let vault: ReturnType<typeof createWebVault> | undefined;
function browserVault() {
  return (vault ??= createWebVault(globalThis.indexedDB, globalThis.crypto));
}
export const persistent = true;
export async function initialize() {
  await browserVault().initialize();
}
export async function getItem(key: string) {
  return browserVault().getItem(key);
}
export async function setItem(key: string, value: string) {
  await browserVault().setItem(key, value);
}
export async function removeItem(key: string) {
  await browserVault().removeItem(key);
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
  await browserVault().clearVault();
}
export async function exportEncrypted(): Promise<{ uri: string; key: string }> {
  throw new Error("Backups are available in the iPhone app.");
}
export async function restoreEncrypted(_uri: string, _key: string) {
  throw new Error("Restore is available in the iPhone app.");
}
