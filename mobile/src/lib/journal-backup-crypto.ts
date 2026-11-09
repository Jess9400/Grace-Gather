import {
  BACKUP_LIMIT,
  decodeBackup,
  type BackupPayload,
} from "./journal-backup";
// Same AES-256-GCM envelope as expo-crypto: 12-byte IV, ciphertext, 16-byte tag.
export async function sealBackup(payload: BackupPayload, crypto: Crypto) {
  const raw = new TextEncoder().encode(JSON.stringify(payload));
  if (raw.byteLength > BACKUP_LIMIT) throw Error("Backup is too large.");
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", secret, "AES-GCM", false, [
    "encrypt",
  ]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, raw),
  );
  const bytes = new Uint8Array(iv.length + encrypted.length);
  bytes.set(iv);
  bytes.set(encrypted, iv.length);
  return {
    bytes,
    key: Array.from(secret, (n) => n.toString(16).padStart(2, "0")).join(""),
  };
}
export async function unsealBackup(
  bytes: Uint8Array<ArrayBuffer>,
  secret: string,
  crypto: Crypto,
) {
  if (
    !/^[a-f0-9]{64}$/i.test(secret) ||
    bytes.length < 28 ||
    bytes.length > BACKUP_LIMIT + 28
  )
    throw Error("Invalid backup or recovery key.");
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(secret.match(/../g)!, (n) => parseInt(n, 16)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const data = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.slice(0, 12) },
    key,
    bytes.slice(12),
  );
  return decodeBackup(new TextDecoder().decode(data));
}
