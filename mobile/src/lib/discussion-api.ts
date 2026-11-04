import type { DiscussionAction, DiscussionState } from "./discussion-model";

export type CommunitySnapshot = DiscussionState & {
  moderation?: {
    active: boolean;
    mode: string;
    externalProcessing: boolean;
    version: number;
  };
  moderator: boolean;
  userId: string;
  limits?: { topics: number; repliesPerTopic: number };
};
type Result = {
  error: { message: string; code?: string } | null;
  data?: unknown;
};
export type CommunityClient = {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<Result>;
  from: (table: string) => {
    upsert: (
      value: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => PromiseLike<Result>;
    delete: () => {
      eq: (
        key: string,
        value: string,
      ) => { eq: (key: string, value: string) => PromiseLike<Result> };
    };
  };
};
async function checked(result: PromiseLike<Result>) {
  const response = await result;
  if (response.error) throw new Error(response.error.message);
  return response.data;
}
export async function loadCommunity(
  client: CommunityClient,
  topic?: string,
): Promise<CommunitySnapshot> {
  const snapshot = (await checked(
    client.rpc("community_snapshot", { p_topic: topic ?? null }),
  )) as CommunitySnapshot;
  const status = await client.rpc("community_moderation_status");
  // Missing rollout metadata cannot silently enable publication in the UI.
  return {
    ...snapshot,
    moderation: status.error
      ? undefined
      : (status.data as CommunitySnapshot["moderation"]),
  };
}
export async function saveCommunityAction(
  client: CommunityClient,
  userId: string,
  action: DiscussionAction,
  alias: string,
) {
  switch (action.type) {
    case "topic":
    case "reply":
      return await checked(
        client.rpc("community_submit", {
          p_title: action.type === "topic" ? action.title.trim() : "",
          p_body: action.body.trim(),
          p_alias: alias.trim(),
          p_perspective: action.perspective,
          p_verse: action.type === "topic" ? (action.verseId ?? null) : null,
          p_reference:
            action.type === "topic" ? (action.reference ?? null) : null,
          p_parent: action.type === "reply" ? action.topicId : null,
        }),
      );
    case "review":
      return await checked(
        client.rpc("community_review", {
          p_post: action.postId,
          p_approve: action.approve,
        }),
      );
    case "report":
      return await checked(
        client.rpc("community_report", {
          p_post: action.postId,
          p_reason: action.reason.trim(),
        }),
      );
    case "resolve":
      return await checked(
        client.rpc("community_resolve", {
          p_report: action.reportId,
          p_remove: action.remove,
        }),
      );
    case "delete":
      return await checked(
        client.rpc("community_delete", { p_post: action.postId }),
      );
    case "block":
      if (action.author === userId)
        throw new Error("You cannot block yourself.");
      return await checked(
        client
          .from("blocks")
          .upsert(
            { user_id: userId, blocked_user_id: action.author },
            { onConflict: "user_id,blocked_user_id", ignoreDuplicates: true },
          ),
      );
    case "unblock":
      return await checked(
        client
          .from("blocks")
          .delete()
          .eq("user_id", userId)
          .eq("blocked_user_id", action.author),
      );
  }
}
export function communityError(error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";
  if (/rate_limited/.test(message))
    return "Please pause a moment before trying again.";
  if (/not_allowed|unauthorized|JWT|session/i.test(message))
    return "Sign in with an eligible account to take part in Community.";
  if (/invalid_|check constraint/i.test(message))
    return "Please check the title, words and display name, then try again.";
  if (/not_found/.test(message))
    return "This conversation is no longer available. Refresh to see the latest.";
  return "Community could not be reached. Please try again or refresh.";
}
