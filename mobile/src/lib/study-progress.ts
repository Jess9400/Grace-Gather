import {
  readingPlans,
  yearPlanIndex,
  yearDayPassages,
  type PlanProgress,
} from "./reading-plans";
/** Count complete chapters only. Partial passage plans never imply a whole book was read. */
export function studyStats(
  progress: PlanProgress,
  books: { code: string; chapters: number }[],
) {
  const chapters = new Map<string, Set<number>>();
  let readings = 0;
  for (const [index, plan] of readingPlans.entries()) {
    const completed = Math.min(
      plan.length,
      Math.max(0, progress.days[index] ?? 0),
    );
    readings += completed;
    for (const passage of plan.slice(0, completed)) {
      if (passage.from || passage.to) continue;
      const set = chapters.get(passage.book) ?? new Set<number>();
      set.add(passage.chapter);
      chapters.set(passage.book, set);
    }
  }
  const yearDays = Math.min(
    365,
    Math.max(0, progress.days[yearPlanIndex] ?? 0),
  );
  readings += yearDays;
  for (let day = 0; day < yearDays; day++)
    for (const passage of yearDayPassages(books, day)) {
      const set = chapters.get(passage.book) ?? new Set<number>();
      set.add(passage.chapter);
      chapters.set(passage.book, set);
    }
  return {
    readings: readings + (progress.devotionalDay ?? 0),
    books: books.filter(
      (book) => chapters.get(book.code)?.size === book.chapters,
    ).length,
  };
}

// Progress from two devices is combined so nothing read is ever lost: each
// plan keeps the furthest day reached, and the current plan comes from
// whichever device changed it last.
export function mergePlanProgress(
  local: PlanProgress,
  remote: PlanProgress,
  remoteNewer: boolean,
): PlanProgress {
  const days: Record<number, number> = {};
  for (const key of new Set([
    ...Object.keys(local.days),
    ...Object.keys(remote.days),
  ])) {
    const index = Number(key);
    days[index] = Math.max(local.days[index] ?? 0, remote.days[index] ?? 0);
  }
  const devotional = [local.devotionalDay, remote.devotionalDay].filter(
    (day): day is number => day !== null,
  );
  return {
    active: remoteNewer
      ? (remote.active ?? local.active)
      : (local.active ?? remote.active),
    devotionalDay: devotional.length ? Math.max(...devotional) : null,
    started: [
      ...new Set([
        ...(local.started ?? []),
        ...(remote.started ?? []),
        ...[local.active, remote.active].filter((n): n is number => n !== null),
      ]),
    ].sort((a, b) => a - b),
    days,
  };
}
export function samePlanProgress(a: PlanProgress, b: PlanProgress) {
  return (
    a.active === b.active &&
    JSON.stringify(a.started ?? []) === JSON.stringify(b.started ?? []) &&
    a.devotionalDay === b.devotionalDay &&
    [...new Set([...Object.keys(a.days), ...Object.keys(b.days)])].every(
      (key) => (a.days[Number(key)] ?? 0) === (b.days[Number(key)] ?? 0),
    )
  );
}
/** Today's Read · Reflect · Pray, and the days a reading was finished. */
export type TodayRecord = { day: string; done: number[]; days: string[] };
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeToday(value: unknown): TodayRecord {
  const row =
    value && typeof value === "object" ? (value as Partial<TodayRecord>) : {};
  return {
    day: typeof row.day === "string" && dayPattern.test(row.day) ? row.day : "",
    done: Array.isArray(row.done)
      ? [...new Set(row.done.filter((step) => [0, 1, 2].includes(step)))].sort()
      : [],
    days: Array.isArray(row.days)
      ? [
          ...new Set(
            row.days.filter(
              (day): day is string =>
                typeof day === "string" && dayPattern.test(day),
            ),
          ),
        ]
          .sort()
          .slice(-30)
      : [],
  };
}
export function mergeToday(a: TodayRecord, b: TodayRecord): TodayRecord {
  const days = [...new Set([...a.days, ...b.days])].sort().slice(-30);
  if (a.day === b.day)
    return {
      day: a.day,
      done: [...new Set([...a.done, ...b.done])].sort(),
      days,
    };
  const later = a.day > b.day ? a : b;
  return { day: later.day, done: later.done, days };
}
