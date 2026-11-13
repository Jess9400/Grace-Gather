import { backend } from "./backend";
import { isMemberSession } from "./account";
import type { Entry } from "./content";
import type { JournalDocumentStore } from "./account-journal-write";
import { uploadJournalAudio } from "./account-journal-audio";

/** All requests are scoped to a checked session; the server enforces ownership. */
export function accountJournalStore(
  owner: string,
): JournalDocumentStore<Entry> {
  let existingAudio = new Set<string>();
  async function uploadNewRecordings(entries: Entry[]) {
    const added = new Set(
      entries
        .map((entry) => entry.audio)
        .filter(
          (audio): audio is string => !!audio && !existingAudio.has(audio),
        ),
    );
    for (const id of added) await uploadJournalAudio(owner, id);
  }
  async function client() {
    if (!backend) throw Error("journal_account_unavailable");
    const { data, error } = await backend.auth.getSession();
    if (
      error ||
      !isMemberSession(data.session) ||
      data.session?.user.id !== owner
    )
      throw Error("journal_account_changed");
    return backend;
  }
  return {
    async read() {
      const db = await client();
      const { data, error } = await db
        .from("account_journals")
        .select("revision,entries")
        .eq("user_id", owner)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        existingAudio = new Set();
        return null;
      }
      if (
        !Number.isSafeInteger(data.revision) ||
        !Array.isArray(data.entries) ||
        data.entries.some(
          (entry: unknown) =>
            !entry ||
            typeof entry !== "object" ||
            typeof (entry as Entry).id !== "string",
        )
      )
        throw Error("journal_account_invalid");
      existingAudio = new Set(
        (data.entries as Entry[])
          .map((entry) => entry.audio)
          .filter((audio): audio is string => !!audio),
      );
      return {
        revision: data.revision as number,
        entries: data.entries as Entry[],
      };
    },
    async create(entries) {
      await uploadNewRecordings(entries);
      const db = await client();
      const { error } = await db
        .from("account_journals")
        .insert({ user_id: owner, revision: 0, entries });
      if (error?.code === "23505") return false;
      if (error) throw error;
      return true;
    },
    async replace(expectedRevision, entries) {
      await uploadNewRecordings(entries);
      const db = await client();
      const { data, error } = await db
        .from("account_journals")
        .update({
          revision: expectedRevision + 1,
          entries,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", owner)
        .eq("revision", expectedRevision)
        .select("revision");
      if (error) throw error;
      return data.length === 1;
    },
  };
}
