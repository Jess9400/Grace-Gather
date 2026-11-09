import { mergeBackup, type BackupOptions } from "./journal-backup";
import { sealBackup, unsealBackup } from "./journal-backup-crypto";
import type { Entry } from "./content";
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
export async function removeAudio(id: string) {
  await browserVault().removeItem(`audio:${id}`);
}
export async function clearVault() {
  await browserVault().clearVault();
}
export async function exportEncrypted(
  options?: BackupOptions,
): Promise<{ uri: string; key: string }> {
  const source: Entry[] =
    options?.entries ?? JSON.parse((await getItem("entries")) ?? "[]");
  const rows = [{ key: "entries", value: JSON.stringify(source) }];
  const profile = await getItem("profile");
  if (profile) rows.push({ key: "profile", value: profile });
  const audio: Record<string, string> = {};
  for (const entry of source)
    if (entry.audio) {
      const value = await getItem(`audio:${entry.audio}`);
      if (!value)
        throw Error("A recording is missing. Your journal has not changed.");
      audio[`${entry.audio}.bin`] = value;
    }
  const result = await sealBackup(
    { version: 1, rows, audio },
    globalThis.crypto,
  );
  return {
    uri: URL.createObjectURL(
      new Blob([result.bytes], { type: "application/octet-stream" }),
    ),
    key: result.key,
  };
}
export function releaseBackup(uri: string) {
  URL.revokeObjectURL(uri);
}
export async function restoreEncrypted(uri: string, key: string) {
  return withJournalLock(async () => {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size > 50 * 1024 * 1024 + 28) throw Error("Backup is too large.");
    const backup = await unsealBackup(
      new Uint8Array(await blob.arrayBuffer()),
      key,
      globalThis.crypto,
    );
    const current = JSON.parse((await getItem("entries")) ?? "[]");
    const profile = JSON.parse((await getItem("profile")) ?? "null");
    const merged = mergeBackup(backup, current, profile);
    for (const row of backup.rows)
      if (row.key.startsWith("course:") && (await getItem(row.key)) === null)
        merged.rows.push(row);
    for (const [name, value] of Object.entries(merged.audio)) {
      const audioKey = `audio:${name.slice(0, -4)}`;
      const existing = await getItem(audioKey);
      if (existing && existing !== value)
        throw Error("A recording with this ID already exists.");
      merged.rows.push({ key: audioKey, value });
    }
    await browserVault().setItems(merged.rows);
  });
}

export async function withJournalLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (globalThis.navigator?.locks)
    return navigator.locks.request("grace-gather-journal", operation);
  return operation();
}
export const automaticCleanupSupported = !!globalThis.navigator?.locks;
