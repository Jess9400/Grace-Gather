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
  const bytes = await storage.readJournalAudio(id);
  const { error } = await client.storage
    .from("account-journal-audio")
    .upload(path, Uint8Array.from(bytes).buffer, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (!error) return;
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
}

/** Download on demand into the encrypted device vault for playback/export. */
export async function restoreJournalAudio(owner: string, id: string) {
  const { client, path } = await audioClient(owner, id);
  const { data, error } = await client.storage
    .from("account-journal-audio")
    .download(path);
  if (error || !data) throw error ?? Error("journal_audio_unavailable");
  await audioClient(owner, id); // Do not attach the result after account switching.
  await storage.writeJournalAudio(id, new Uint8Array(await data.arrayBuffer()));
}
