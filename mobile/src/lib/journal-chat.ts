import type { JournalMessage } from "./content";
export const JOURNAL_MESSAGE_LIMIT = 40;
// After ten exchanges, keep the latest two exchanges inline. Earlier messages
// remain in the entry and can be unfolded; no message is trimmed or discarded.
export function partitionJournalMessages(messages: JournalMessage[]) {
  if (messages.length < 20) return { older: [], recent: messages };
  const starts = messages.flatMap((m, index) =>
    m.role === "user" ? [index] : [],
  );
  const start =
    starts.length >= 2 ? starts.at(-2)! : Math.max(0, messages.length - 4);
  return { older: messages.slice(0, start), recent: messages.slice(start) };
}
