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
