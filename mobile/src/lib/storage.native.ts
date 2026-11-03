import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
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
export async function exportEncrypted() {
  await initialize();
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    "SELECT key,value FROM vault WHERE key IN ('profile','entries') OR key LIKE 'course:%'",
  );
  const audio: Record<string, string> = {};
  for (const f of audioDir().list()) {
    if (f instanceof File)
      audio[f.name] = base64(
        new Uint8Array(
          await aesDecryptAsync(
            AESSealedData.fromCombined(await f.bytes()),
            encryptionKey,
          ),
        ),
      );
  }
  const backupKey = await AESEncryptionKey.generate();
  const raw = new TextEncoder().encode(
    JSON.stringify({ version: 1, rows, audio }),
  );
  if (raw.byteLength > 50 * 1024 * 1024)
    throw new Error(
      "This backup exceeds the 50 MB limit. Export fewer recordings.",
    );
  const encrypted = await aesEncryptAsync(raw, backupKey);
  const file = new File(Paths.cache, "grace-and-gather-backup.bin");
  await file.write(await encrypted.combined());
  return { uri: file.uri, key: await backupKey.encoded("hex") };
}
export async function restoreEncrypted(uri: string, key: string) {
  await initialize();
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("Enter the 64-character recovery key.");
  const current = JSON.parse((await getItem("entries")) ?? "[]");
  if (current.length)
    throw new Error(
      "Restore requires an empty journal. Export and remove existing entries first.",
    );
  const file = new File(uri);
  if (file.size > 50 * 1024 * 1024) throw new Error("Backup is too large.");
  const restored = JSON.parse(
    new TextDecoder().decode(
      await aesDecryptAsync(
        AESSealedData.fromCombined(await file.bytes()),
        await AESEncryptionKey.import(key, "hex"),
      ),
    ),
  );
  if (
    restored.version !== 1 ||
    !Array.isArray(restored.rows) ||
    !restored.audio ||
    typeof restored.audio !== "object"
  )
    throw new Error("Unsupported backup.");
  const rows: { key: string; value: string }[] = restored.rows;
  for (const row of rows) {
    if (
      typeof row.key !== "string" ||
      typeof row.value !== "string" ||
      !/^(profile|entries|course:[a-z0-9-]+)$/.test(row.key)
    )
      throw new Error("Invalid backup data.");
    JSON.parse(row.value);
  }
  const entries = JSON.parse(
    rows.find((r) => r.key === "entries")?.value ?? "[]",
  );
  if (
    !Array.isArray(entries) ||
    entries.some(
      (e) =>
        !e ||
        typeof e.id !== "string" ||
        !/^[a-z0-9-]+$/i.test(e.id) ||
        typeof e.text !== "string" ||
        !e.prefs ||
        !["en", "pt", "es", "ru"].includes(e.prefs.language) ||
        ![
          "grateful",
          "peaceful",
          "hopeful",
          "anxious",
          "lonely",
          "sad",
          "overwhelmed",
          "hopeless",
          "unsure",
        ].includes(e.mood) ||
        !Number.isFinite(Date.parse(e.createdAt)),
    )
  )
    throw new Error("Invalid journal entries.");
  const p = JSON.parse(rows.find((r) => r.key === "profile")?.value ?? "null");
  if (
    p &&
    (!["en", "pt", "es", "ru"].includes(p.language) ||
      typeof p.name !== "string" ||
      typeof p.city !== "string" ||
      typeof p.region !== "string")
  )
    throw new Error("Invalid profile.");
  const created: File[] = [];
  try {
    for (const [name, value] of Object.entries(restored.audio)) {
      if (!/^[a-z0-9-]+\.bin$/i.test(name) || typeof value !== "string")
        throw new Error("Invalid audio backup.");
      const target = new File(audioDir(), name);
      if (target.exists)
        throw new Error("A recording with this ID already exists.");
      const raw = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
      const sealed = await aesEncryptAsync(raw, encryptionKey);
      await target.write(await sealed.combined());
      created.push(target);
    }
    await database.withExclusiveTransactionAsync(async (tx) => {
      for (const row of rows)
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
}
