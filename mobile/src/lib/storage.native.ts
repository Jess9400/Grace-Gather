import {
  BACKUP_LIMIT,
  decodeBackup,
  mergeBackup,
  type BackupOptions,
} from "./journal-backup";
import { journalBackupAudioNames } from "../generated/quiet-diary";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
  randomUUID,
} from "expo-crypto";
import { File, Directory, Paths } from "expo-file-system";

const KEY = "awaychurch.vault.v1";
let database: SQLite.SQLiteDatabase;
let encryptionKey: AESEncryptionKey;
let opening: Promise<void> | undefined;
const audioDir = () => new Directory(Paths.document, "private-audio");
const playbackDir = () => new Directory(Paths.cache, "away-playback");
export const persistent = true;
export function initialize() {
  return (opening ??= open());
}
async function open() {
  const oldKey = await SecureStore.getItemAsync(KEY);
  const existing = new File(SQLite.defaultDatabaseDirectory, "away.db").exists;
  if (!oldKey && existing)
    throw new Error(
      "The journal key is missing. Your files have been preserved. Contact support before reinstalling.",
    );
  const key =
    oldKey ?? (await (await AESEncryptionKey.generate()).encoded("hex"));
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("The journal key could not be read.");
  if (!oldKey)
    await SecureStore.setItemAsync(KEY, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  database = await SQLite.openDatabaseAsync("away.db");
  const cipher = await database.getFirstAsync<{ cipher_version: string }>(
    "PRAGMA cipher_version",
  );
  if (!cipher?.cipher_version)
    throw new Error(
      "Encrypted storage requires a Grace & Gather development or App Store build. Expo Go is not supported.",
    );
  await database.execAsync(`PRAGMA key = "x'${key}'";`);
  await database.getFirstAsync("SELECT count(*) FROM sqlite_master");
  await database.execAsync(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS vault (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
  );
  encryptionKey = await AESEncryptionKey.import(key, "hex");
  audioDir().create({ idempotent: true, intermediates: true });
  const cache = playbackDir();
  if (cache.exists) cache.delete();
  cache.create({ intermediates: true });
}
export async function getItem(key: string) {
  await initialize();
  return (
    (
      await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM vault WHERE key=?",
        key,
      )
    )?.value ?? null
  );
}
export async function setItem(key: string, value: string) {
  await initialize();
  await database.runAsync(
    "INSERT INTO vault(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    key,
    value,
  );
}
export async function removeItem(key: string) {
  await initialize();
  await database.runAsync("DELETE FROM vault WHERE key=?", key);
}
export async function protectAudio(uri: string, id: string) {
  await initialize();
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid recording");
  const source = new File(uri);
  const destination = new File(audioDir(), id + ".bin");
  const sealed = await aesEncryptAsync(await source.bytes(), encryptionKey);
  await destination.write(await sealed.combined());
  source.delete();
  return id;
}
export async function playableAudio(id: string) {
  await initialize();
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid recording");
  const source = new File(audioDir(), id + ".bin");
  const target = new File(playbackDir(), id + ".m4a");
  await target.write(
    await aesDecryptAsync(
      AESSealedData.fromCombined(await source.bytes()),
      encryptionKey,
    ),
  );
  return target.uri;
}
// Journal synchronization reads and writes recordings through the encrypted
// device vault; the temporary playback directory is not used for transfers.
export async function readJournalAudio(id: string): Promise<Uint8Array> {
  await initialize();
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid recording");
  const source = new File(audioDir(), id + ".bin");
  return new Uint8Array(
    await aesDecryptAsync(
      AESSealedData.fromCombined(await source.bytes()),
      encryptionKey,
    ),
  );
}
export async function writeJournalAudio(id: string, bytes: Uint8Array) {
  await initialize();
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("Invalid recording");
  const target = new File(audioDir(), id + ".bin");
  if (target.exists) {
    const existing = await readJournalAudio(id);
    if (
      existing.length !== bytes.length ||
      existing.some((value, i) => value !== bytes[i])
    )
      throw Error("A different recording with this ID already exists.");
    return;
  }
  const sealed = await aesEncryptAsync(bytes, encryptionKey);
  await target.write(await sealed.combined());
}
export function clearPlayback() {
  const dir = playbackDir();
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
}
export async function removeAudio(id: string) {
  if (!/^[a-z0-9-]+$/i.test(id)) return;
  const file = new File(audioDir(), id + ".bin");
  if (file.exists) file.delete();
  clearPlayback();
}
export async function clearVault() {
  await initialize();
  await database.execAsync(
    "DELETE FROM vault; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;",
  );
  const dir = audioDir();
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  clearPlayback();
}
function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function exportEncrypted(options?: BackupOptions) {
  await initialize();
  let rows = await database.getAllAsync<{ key: string; value: string }>(
    "SELECT key,value FROM vault WHERE key IN ('profile','entries') OR key LIKE 'course:%'",
  );
  if (options) {
    rows = rows.filter((r) => r.key === "entries" || r.key === "profile");
    const stored = rows.find((r) => r.key === "entries");
    if (stored) stored.value = JSON.stringify(options.entries);
    else rows.push({ key: "entries", value: JSON.stringify(options.entries) });
  }
  const audio: Record<string, string> = {};
  const included = new Set(
    journalBackupAudioNames(
      JSON.parse(rows.find((r) => r.key === "entries")?.value ?? "[]"),
    ),
  );
  for (const name of included) {
    const cacheName = options?.audioOwner
      ? `journal-${options.audioOwner}-${name}`
      : name;
    const f = new File(audioDir(), cacheName);
    if (f.exists)
      audio[name] = base64(
        new Uint8Array(
          await aesDecryptAsync(
            AESSealedData.fromCombined(await f.bytes()),
            encryptionKey,
          ),
        ),
      );
  }
  for (const name of included)
    if (!Object.hasOwn(audio, name))
      throw Error("A recording is missing from this backup.");
  const backupKey = await AESEncryptionKey.generate();
  const raw = new TextEncoder().encode(
    JSON.stringify({ version: 1, rows, audio }),
  );
  if (raw.byteLength > 50 * 1024 * 1024)
    throw new Error(
      "This backup exceeds the 50 MB limit. Export fewer recordings.",
    );
  const encrypted = await aesEncryptAsync(raw, backupKey);
  const file = new File(Paths.cache, `grace-and-gather-${randomUUID()}.bin`);
  await file.write(await encrypted.combined());
  return { uri: file.uri, key: await backupKey.encoded("hex") };
}
export function releaseBackup(uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
}
export async function restoreEncrypted(
  uri: string,
  key: string,
  entriesKey = "entries",
) {
  return withJournalLock(async () => {
    await initialize();
    if (!/^[a-f0-9]{64}$/i.test(key))
      throw Error("Enter the 64-character recovery key.");
    const file = new File(uri);
    if (file.size > BACKUP_LIMIT + 28) throw Error("Backup is too large.");
    const restored = decodeBackup(
      new TextDecoder().decode(
        await aesDecryptAsync(
          AESSealedData.fromCombined(await file.bytes()),
          await AESEncryptionKey.import(key, "hex"),
        ),
      ),
    );
    const merged = mergeBackup(
      restored,
      JSON.parse((await getItem(entriesKey)) ?? "[]"),
      JSON.parse((await getItem("profile")) ?? "null"),
    );
    for (const row of merged.rows)
      if (row.key === "entries") row.key = entriesKey;
    for (const row of restored.rows)
      if (row.key.startsWith("course:") && (await getItem(row.key)) === null)
        merged.rows.push(row);
    const created: File[] = [];
    try {
      for (const [name, value] of Object.entries(merged.audio)) {
        const target = new File(audioDir(), name);
        if (target.exists) {
          const existing = await readJournalAudio(name.slice(0, -4));
          const restored = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
          if (
            existing.length !== restored.length ||
            existing.some((byte, index) => byte !== restored[index])
          )
            throw Error("A different recording with this ID already exists.");
          continue;
        }
        const sealed = await aesEncryptAsync(
          Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
          encryptionKey,
        );
        await target.write(await sealed.combined());
        created.push(target);
      }
      await database.withExclusiveTransactionAsync(async (tx) => {
        for (const row of merged.rows)
          await tx.runAsync(
            "INSERT INTO vault(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            row.key,
            row.value,
          );
      });
    } catch (error) {
      for (const f of created) if (f.exists) f.delete();
      throw error;
    }
  });
}

let journalLock: Promise<unknown> = Promise.resolve();
export async function withJournalLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const task = journalLock.then(operation);
  journalLock = task.catch(() => {});
  return task;
}
export const automaticCleanupSupported = true;
