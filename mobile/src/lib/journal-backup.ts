import type { Entry, JournalMessage, Profile } from "./content";
export const BACKUP_LIMIT = 50 * 1024 * 1024;
export interface BackupPayload {
  version: 1;
  rows: { key: string; value: string }[];
  audio: Record<string, string>;
}
export interface BackupOptions {
  entries: Entry[];
}
const validId = (s: unknown): s is string =>
  typeof s === "string" && /^[a-z0-9-]+$/i.test(s);
const validDate = (s: unknown) =>
  typeof s === "string" && Number.isFinite(Date.parse(s));
const languages = ["en", "pt", "es", "ru"];
function validMessages(messages: unknown): messages is JournalMessage[] {
  return (
    Array.isArray(messages) &&
    messages.length <= 10000 &&
    messages.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" &&
        m.content.length <= 30000 &&
        (m.actionId === undefined || /^A\d{2}$/.test(m.actionId)) &&
        (m.createdAt === undefined || validDate(m.createdAt)),
    )
  );
}
export function validateJournalEntries(
  value: unknown,
): asserts value is Entry[] {
  if (
    !Array.isArray(value) ||
    value.length > 100000 ||
    value.some((e) => {
      if (
        !e ||
        !validId(e.id) ||
        typeof e.text !== "string" ||
        e.text.length > 30000 ||
        !validDate(e.createdAt) ||
        !e.prefs ||
        !languages.includes(e.prefs.language) ||
        !languages.includes(e.prefs.scriptureLanguage) ||
        !["catholic", "protestant", "orthodox"].includes(e.prefs.tradition) ||
        typeof e.prefs.edition !== "string" ||
        typeof e.safety !== "boolean" ||
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
        ].includes(e.mood)
      )
        return true;
      if (e.audio !== undefined && !validId(e.audio)) return true;
      if (e.conversation !== undefined && !validMessages(e.conversation))
        return true;
      if (e.deletedAt !== undefined && !validDate(e.deletedAt)) return true;
      if (
        e.conversationUpdatedAt !== undefined &&
        !validDate(e.conversationUpdatedAt)
      )
        return true;
      if (
        e.keepConversation !== undefined &&
        typeof e.keepConversation !== "boolean"
      )
        return true;
      if (
        e.chatCleanup &&
        (!validDate(e.chatCleanup.deleteAt) ||
          (e.chatCleanup.seenAt !== undefined &&
            !validDate(e.chatCleanup.seenAt)))
      )
        return true;
      if (
        e.deletedConversations !== undefined &&
        (!Array.isArray(e.deletedConversations) ||
          e.deletedConversations.some(
            (c: { id?: unknown; deletedAt?: unknown; messages?: unknown }) =>
              typeof c.id !== "string" ||
              !validDate(c.deletedAt) ||
              !validMessages(c.messages),
          ))
      )
        return true;
      if (
        e.response &&
        (typeof e.response.actionId !== "string" ||
          !/^A\d{2}$/.test(e.response.actionId) ||
          typeof e.response.actionTitle !== "string" ||
          typeof e.response.invitation !== "string" ||
          (e.response.verse &&
            [
              "id",
              "text",
              "reference",
              "editionName",
              "attribution",
              "licenseUrl",
            ].some((k) => typeof e.response.verse[k] !== "string")))
      )
        return true;
      return false;
    }) ||
    new Set(value.map((e) => e.id)).size !== value.length
  )
    throw Error("Invalid journal entries.");
}
export function decodeBackup(text: string): BackupPayload {
  if (new TextEncoder().encode(text).byteLength > BACKUP_LIMIT)
    throw Error("Backup is too large.");
  const data = JSON.parse(text);
  if (
    data?.version !== 1 ||
    !Array.isArray(data.rows) ||
    !data.audio ||
    Array.isArray(data.audio) ||
    typeof data.audio !== "object"
  )
    throw Error("Unsupported backup.");
  const keys = new Set<string>();
  for (const row of data.rows) {
    if (
      typeof row.key !== "string" ||
      typeof row.value !== "string" ||
      !/^(profile|entries|course:[a-z0-9-]+)$/.test(row.key) ||
      keys.has(row.key)
    )
      throw Error("Invalid backup data.");
    keys.add(row.key);
    JSON.parse(row.value);
  }
  const entries = JSON.parse(
    data.rows.find((r: { key: string }) => r.key === "entries")?.value ?? "[]",
  );
  validateJournalEntries(entries);
  const profile = JSON.parse(
    data.rows.find((r: { key: string }) => r.key === "profile")?.value ??
      "null",
  );
  if (
    profile &&
    (!languages.includes(profile.language) ||
      !languages.includes(profile.scriptureLanguage) ||
      !["catholic", "protestant", "orthodox"].includes(profile.tradition) ||
      ["name", "city", "region", "edition"].some(
        (k) => typeof profile[k] !== "string",
      ))
  )
    throw Error("Invalid profile.");
  const recordings = new Set(
    entries.flatMap((e) => (e.audio ? [`${e.audio}.bin`] : [])),
  );
  for (const [name, value] of Object.entries(data.audio)) {
    if (
      !/^[a-z0-9-]+\.bin$/i.test(name) ||
      !recordings.has(name) ||
      typeof value !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        value,
      )
    )
      throw Error("Invalid audio backup.");
  }
  for (const name of recordings)
    if (!Object.hasOwn(data.audio, name))
      throw Error("A recording is missing from this backup.");
  return data;
}
export function mergeBackup(
  payload: BackupPayload,
  current: Entry[],
  profile: Profile | null,
) {
  const incoming: Entry[] = JSON.parse(
    payload.rows.find((r) => r.key === "entries")?.value ?? "[]",
  );
  const existing = new Set(current.map((e) => e.id));
  // A restored conversation is retained until the user chooses to clean it up.
  const added = incoming
    .filter((e) => !existing.has(e.id))
    .map((e) => ({
      ...e,
      sessionOnly: false,
      keepConversation: true,
      chatCleanup: undefined,
    }));
  const rows = [
    {
      key: "entries",
      value: JSON.stringify(
        [...current, ...added].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      ),
    },
  ];
  const restoredProfile = payload.rows.find((r) => r.key === "profile");
  if (!profile?.onboarded && restoredProfile) {
    const p = JSON.parse(restoredProfile.value);
    rows.push({
      key: "profile",
      value: JSON.stringify({ ...p, deleteJournalChatsAfter90Days: false }),
    });
  }
  const names = new Set(
    added.flatMap((e) => (e.audio ? [`${e.audio}.bin`] : [])),
  );
  return {
    rows,
    audio: Object.fromEntries(
      Object.entries(payload.audio).filter(([name]) => names.has(name)),
    ),
  };
}
