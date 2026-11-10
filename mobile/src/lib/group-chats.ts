import { requireUser } from "./backend";
import type { Language } from "./content";

// Group chats are open rooms: any signed-in member can read and write, under
// the public name they chose. All access goes through one server command.
export type GroupChat = {
  id: string;
  slug: string;
  title: Partial<Record<Language, string>>;
  description: Partial<Record<Language, string>>;
  latest_at: string | null;
};
export type GroupMessage = {
  id: string;
  body: string;
  name: string;
  mine: boolean;
  created_at: string;
};
export type GroupReport = {
  id: string;
  body: string;
  name: string;
  reason: string;
};
export async function groupChats(
  action: string,
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const result = await client.rpc("group_chat_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data;
}
// What went wrong, in terms the screen can explain.
export function groupChatProblem(
  error: unknown,
): "unavailable" | "rate_limited" | "name_required" | "failed" {
  const e = error as { message?: string; code?: string } | null;
  const message = e?.message ?? "";
  if (message.includes("rate_limited")) return "rate_limited";
  if (message.includes("name_required")) return "name_required";
  // The server part has not been set up yet (the command does not exist).
  if (e?.code === "PGRST202" || e?.code === "42883") return "unavailable";
  return "failed";
}
export const localized = (
  text: Partial<Record<Language, string>>,
  language: Language,
) => text[language] ?? text.en ?? "";
export const GROUP_PAGE = 50;
// Folds the newest page into what is on screen, oldest first. The newest page
// replaces everything in its time range, so a message that was removed or whose
// author was blocked disappears on the next refresh; older pages already loaded
// stay in place.
export function mergeGroupMessages(
  previous: GroupMessage[],
  latest: GroupMessage[],
) {
  if (latest.length < GROUP_PAGE) return latest;
  const first = latest[0];
  const older = previous.filter(
    (m) =>
      m.created_at < first.created_at ||
      (m.created_at === first.created_at && m.id < first.id),
  );
  return [...older, ...latest];
}
