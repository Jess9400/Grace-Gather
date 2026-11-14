import { backend } from "./backend";
import { isMemberSession } from "./account";
import * as storage from "./storage";

async function audioClient(owner: string, id: string) {
  if (!/^[a-z0-9-]+$/i.test(id) || !backend)
    throw Error("journal_audio_unavailable");
  const { data, error } = await backend.auth.getSession();
  if (
    error ||
    !isMemberSession(data.session) ||
    data.session?.user.id !== owner
  )
    throw Error("journal_account_changed");
  return { client: backend, path: `${owner}/${id}.bin` };
}

/** Upload immutable recordings before saving the entry that refers to them. */
export async function uploadJournalAudio(owner: string, id: string) {
  const { client, path } = await audioClient(owner, id);
  const previousOwner = await storage.getItem(`journal-audio-owner:${id}`);
  if (previousOwner && previousOwner !== owner)
    throw Error("journal_audio_owner_conflict");
  const bytes = await storage.readJournalAudio(id);
  const { error } = await client.storage
    .from("account-journal-audio")
    .upload(path, Uint8Array.from(bytes).buffer, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (!error) {
    await storage.setItem(`journal-audio-owner:${id}`, owner);
    return;
  }
  // An interrupted upload can be retried only if the existing object matches.
  const existing = await client.storage
    .from("account-journal-audio")
    .download(path);
  if (existing.error || !existing.data) throw error;
  const received = new Uint8Array(await existing.data.arrayBuffer());
  if (
    received.length !== bytes.length ||
    received.some((value, i) => value !== bytes[i])
  )
    throw Error("journal_audio_conflict");
  await storage.setItem(`journal-audio-owner:${id}`, owner);
}

/** Download on demand into the encrypted device vault for playback/export. */
export async function restoreJournalAudio(owner: string, id: string) {
  const { client, path } = await audioClient(owner, id);
  const { data, error } = await client.storage
    .from("account-journal-audio")
    .download(path);
  if (error || !data) throw error ?? Error("journal_audio_unavailable");
  await audioClient(owner, id); // Do not attach the result after account switching.
  await storage.writeJournalAudio(
    journalAudioCacheId(owner, id),
    new Uint8Array(await data.arrayBuffer()),
  );
}

export const journalAudioCacheId = (owner: string, id: string) =>
  `journal-${owner}-${id}`;

/** Never play another account's cached recording after an account switch. */
export async function ensureJournalAudio(owner: string, id: string) {
  await audioClient(owner, id);
  const cacheId = journalAudioCacheId(owner, id);
  try {
    await storage.readJournalAudio(cacheId);
  } catch {
    await restoreJournalAudio(owner, id);
  }
  await audioClient(owner, id);
  return cacheId;
}

export async function deleteJournalAudio(owner: string, id: string) {
  const { client, path } = await audioClient(owner, id);
  const { error } = await client.storage
    .from("account-journal-audio")
    .remove([path]);
  if (error) throw error;
  await audioClient(owner, id);
  await storage.removeAudio(journalAudioCacheId(owner, id));
  if ((await storage.getItem(`journal-audio-owner:${id}`)) === owner) {
    await storage.removeAudio(id);
    await storage.removeItem(`journal-audio-owner:${id}`);
  }
}
