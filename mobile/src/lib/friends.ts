import { requireUser } from "./backend";
import { refreshPrayerBadges } from "./prayers";
export type Friend = {
  id: string;
  peer: string;
  name: string;
  status: "pending" | "accepted";
  outgoing: boolean;
};
export type Message = {
  id: string;
  body: string;
  mine: boolean;
  created_at: string;
};
export async function friends(
  action: string,
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const result = await client.rpc("friends_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data;
}
export async function markFriendMessagesRead(
  linkId: string,
  messages: Message[],
) {
  const newest = messages.at(-1);
  if (!newest) return;
  const { client } = await requireUser();
  const result = await client.rpc("friend_mark_read", {
    p_link: linkId,
    p_message: newest.id,
  });
  if (result.error) throw result.error;
  refreshPrayerBadges();
}
/** Friend links: share a private link; whoever opens it and confirms becomes a friend. */
export async function friendInvite(
  action: "link" | "reset" | "preview" | "accept",
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const result = await client.rpc("friend_invite_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data;
}
export const friendLinkUrl = (token: string) =>
  "https://grace-gather.findflockie.workers.dev/friends?view=friends&add=" +
  encodeURIComponent(token);
