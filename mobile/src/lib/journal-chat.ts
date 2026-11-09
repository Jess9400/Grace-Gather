import { needsSupport, type JournalMessage } from "./content";

export const JOURNAL_MESSAGE_LIMIT = 40;

// Keep the newest invitation available through later listening-only replies.
// A support response replaces ordinary suggestions, including the first one.
export function currentJournalAction(
  messages: JournalMessage[],
  initialAction: string,
) {
  const last = messages.at(-1);
  if (last?.role === "user" && needsSupport(last.content)) return null;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.support) return null;
    if (message.role === "assistant" && message.actionId)
      return { actionId: message.actionId, messageId: message.id };
  }
  return { actionId: initialAction, messageId: undefined };
}
