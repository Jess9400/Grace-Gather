// Which notice Home should show: the first kind, in order of how personal it
// is, whose unread count rose since the last time it was announced.
export type NoticeKind = "messages" | "prayers" | "activity" | "gatherings";
export type NoticeCounts = Record<NoticeKind, number>;
export const NOTICE_ORDER: NoticeKind[] = ["messages", "prayers", "activity", "gatherings"];
export function freshNotice(
  counts: NoticeCounts,
  announced: NoticeCounts | null,
): NoticeKind | null {
  const before = announced ?? { messages: 0, prayers: 0, activity: 0, gatherings: 0 };
  return NOTICE_ORDER.find((kind) => counts[kind] > before[kind]) ?? null;
}
