export type ActivityItem = {
  id: string;
  kind:
    | "confession_reply"
    | "discussion_reply"
    | "confession_thanks"
    | "study_invitation"
    | "study_comment";
  target: string;
  is_read: boolean;
};

// One card per destination; retain every unread id so opening the destination
// marks exactly the notifications shown, not any replies arriving later.
export function groupUnreadActivity(items: ActivityItem[]) {
  const groups = new Map<string, { item: ActivityItem; ids: string[] }>();
  for (const item of items) {
    if (item.is_read) continue;
    const key = JSON.stringify([item.kind, item.target]);
    const group = groups.get(key);
    if (group) group.ids.push(item.id);
    else groups.set(key, { item, ids: [item.id] });
  }
  return [...groups.values()];
}

export function activityDestination(
  item: Pick<ActivityItem, "kind" | "target">,
) {
  if (item.kind === "study_invitation" || item.kind === "study_comment")
    return { pathname: "/pro" as const, params: { together: item.target } };
  if (item.kind === "discussion_reply") {
    return {
      pathname: "/friends" as const,
      params: { topic: item.target, from: "discover" },
    };
  }
  return {
    pathname: "/confession" as const,
    params: { view: "detail", item: item.target },
  };
}
