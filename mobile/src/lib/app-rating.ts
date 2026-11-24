const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_VISIT_DAYS = 3;

export const APP_REVIEW_URL = "https://apps.apple.com/app/id6833897169?action=write-review";

export interface RatingHistory {
  firstVisit: number;
  days: number[];
  requested: boolean;
}

export function recordVisit(history: RatingHistory | null, now: Date): RatingHistory {
  const day = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS;
  if (!history) return { firstVisit: now.getTime(), days: [day], requested: false };
  if (history.requested || history.days.length >= MIN_VISIT_DAYS || history.days.includes(day)) return history;
  return { ...history, days: [...history.days, day] };
}

export function readyForRating(history: RatingHistory, now: Date) {
  return !history.requested && history.days.length >= MIN_VISIT_DAYS &&
    now.getTime() - history.firstVisit >= 14 * DAY_MS;
}

// A verse opened from a journal entry does not start a Bible Study visit.
export function inBibleStudy(path: string, wasStudying: boolean) {
  return path === "/bible" || (wasStudying && (path.startsWith("/verse/") || path === "/study"));
}
