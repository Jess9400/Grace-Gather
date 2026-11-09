import type { Entry, JournalMessage } from "./content";

export const DAY = 86_400_000;
export const CHAT_RETENTION_DAYS = 90;
export const CLEANUP_NOTICE_DAYS = 7;
export const RECOVERY_DAYS = 30;
const stamp = (value?: string) => (value ? Date.parse(value) : NaN);

// Calendar months, with month-end clamping (May 31 -> February 28/29).
export function archiveCutoff(now = Date.now()) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 3);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
}
export function isArchived(entry: Entry, now = Date.now()) {
  return stamp(entry.createdAt) < archiveCutoff(now);
}
export function recoveryEnds(deletedAt: string) {
  return new Date(stamp(deletedAt) + RECOVERY_DAYS * DAY).toISOString();
}
export function conversationExpiry(entry: Entry) {
  const times = [
    entry.conversationUpdatedAt,
    ...(entry.conversation ?? []).map((m) => m.createdAt),
  ]
    .map(stamp)
    .filter(Number.isFinite);
  const latest = times.length ? Math.max(...times) : stamp(entry.createdAt);
  return latest + CHAT_RETENTION_DAYS * DAY;
}
export function deleteConversation(entry: Entry, now = Date.now()): Entry {
  if (!entry.conversation?.length) return entry;
  const deletedAt = new Date(now).toISOString();
  return {
    ...entry,
    conversation: [],
    conversationUpdatedAt: undefined,
    chatCleanup: undefined,
    deletedConversations: [
      ...(entry.deletedConversations ?? []),
      {
        id: `${entry.id}:${deletedAt}`,
        deletedAt,
        messages: entry.conversation,
      },
    ],
  };
}
export function restoreConversation(entry: Entry, id: string): Entry {
  const removed = entry.deletedConversations?.find((c) => c.id === id);
  if (!removed) throw Error("conversation_not_found");
  const unique = new Map<string, JournalMessage>();
  for (const message of [...removed.messages, ...(entry.conversation ?? [])])
    unique.set(message.id, message);
  return {
    ...entry,
    conversation: [...unique.values()],
    keepConversation: true,
    chatCleanup: undefined,
    conversationUpdatedAt: new Date().toISOString(),
    deletedConversations: entry.deletedConversations?.filter(
      (c) => c.id !== id,
    ),
  };
}
// Cleanup is evaluated on launch/foreground and while the app is open. No
// background server receives journal text. Nothing is removed before a visible
// notice and a full seven-day grace period, even when the user was away.
export function applyJournalRetention(
  entries: Entry[],
  enabled: boolean,
  now = Date.now(),
) {
  const removedAudio: string[] = [];
  const next = entries.flatMap((original) => {
    if (original.deletedAt && stamp(recoveryEnds(original.deletedAt)) <= now) {
      if (original.audio) removedAudio.push(original.audio);
      return [];
    }
    let entry = original;
    if (
      entry.deletedConversations?.some(
        (c) => stamp(recoveryEnds(c.deletedAt)) <= now,
      )
    ) {
      entry = {
        ...entry,
        deletedConversations: entry.deletedConversations.filter(
          (c) => stamp(recoveryEnds(c.deletedAt)) > now,
        ),
      };
    }
    if (
      entry.deletedAt ||
      !enabled ||
      entry.keepConversation ||
      !entry.conversation?.length
    ) {
      return [entry.chatCleanup ? { ...entry, chatCleanup: undefined } : entry];
    }
    const expires = conversationExpiry(entry);
    if (!Number.isFinite(expires)) return [entry]; // Invalid dates never cause data loss.
    if (!entry.chatCleanup && expires - CLEANUP_NOTICE_DAYS * DAY <= now) {
      entry = {
        ...entry,
        chatCleanup: {
          deleteAt: new Date(
            Math.max(expires, now + CLEANUP_NOTICE_DAYS * DAY),
          ).toISOString(),
        },
      };
    }
    const notice = entry.chatCleanup;
    if (
      notice?.seenAt &&
      stamp(notice.deleteAt) <= now &&
      stamp(notice.seenAt) + CLEANUP_NOTICE_DAYS * DAY <= now
    ) {
      entry = deleteConversation(entry, now);
    }
    return [entry];
  });
  return {
    entries: next,
    removedAudio,
    changed:
      next.length !== entries.length || next.some((e, i) => e !== entries[i]),
  };
}
export function acknowledgeCleanup(entry: Entry, now = Date.now()): Entry {
  if (!entry.chatCleanup || entry.chatCleanup.seenAt) return entry;
  return {
    ...entry,
    chatCleanup: {
      seenAt: new Date(now).toISOString(),
      deleteAt: new Date(
        Math.max(
          stamp(entry.chatCleanup.deleteAt),
          now + CLEANUP_NOTICE_DAYS * DAY,
        ),
      ).toISOString(),
    },
  };
}
