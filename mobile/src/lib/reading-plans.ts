export type PlanPassage = {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
};
export const readingPlans: PlanPassage[][] = [
  Array.from({ length: 16 }, (_, i) => ({ book: "MRK", chapter: i + 1 })),
  [23, 46, 62, 91, 121, 130, 139].map((chapter) => ({ book: "PSA", chapter })),
  [5, 6, 7].map((chapter) => ({ book: "MAT", chapter })),
  [1, 2, 3, 4, 5].map((chapter) => ({ book: "JAS", chapter })),
  [1, 2, 3, 4].map((chapter) => ({ book: "RUT", chapter })),
  [
    { book: "1CO", chapter: 13 },
    { book: "JHN", chapter: 13, from: 1, to: 17 },
    { book: "LUK", chapter: 10, from: 25, to: 37 },
    { book: "ROM", chapter: 12 },
    { book: "1JN", chapter: 4, from: 7, to: 21 },
  ],
  Array.from({ length: 21 }, (_, i) => ({ book: "JHN", chapter: i + 1 })),
  Array.from({ length: 24 }, (_, i) => ({ book: "LUK", chapter: i + 1 })),
  Array.from({ length: 28 }, (_, i) => ({ book: "ACT", chapter: i + 1 })),
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50].map((chapter) => ({
    book: "GEN",
    chapter,
  })),
  [1, 2, 3, 4].map((chapter) => ({ book: "PHP", chapter })),
  [1, 2, 3, 4, 5, 6].map((chapter) => ({ book: "EPH", chapter })),
  [
    { book: "LUK", chapter: 15 },
    { book: "MAT", chapter: 18, from: 21, to: 35 },
    { book: "GEN", chapter: 45 },
    { book: "COL", chapter: 3 },
    { book: "ROM", chapter: 12 },
  ],
  [1, 2, 3, 4].map((chapter) => ({ book: "JON", chapter })),
];
// These Psalms use Hebrew numbering. Catholic and Orthodox editions must use
// their own verified numbering, including Psalm 23 -> 22.
export function planPassage(
  plan: number,
  day: number,
  collection: string,
): PlanPassage | null {
  const passage = readingPlans[plan]?.[day];
  if (!passage) return null;
  if (
    passage.book !== "PSA" ||
    !["dra", "brenton", "synodal"].includes(collection)
  )
    return passage;
  const mapping: Record<number, number> = {
    23: 22,
    46: 45,
    62: 61,
    91: 90,
    121: 120,
    130: 129,
    139: 138,
  };
  return { ...passage, chapter: mapping[passage.chapter] };
}
export type PlanProgress = {
  active: number | null;
  started?: number[];
  devotionalDay: number | null;
  days: Record<number, number>;
};
export function normalizePlanProgress(value: unknown): PlanProgress {
  const row =
    value && typeof value === "object" ? (value as Partial<PlanProgress>) : {};
  const days: Record<number, number> = {};
  for (let i = 0; i <= readingPlans.length; i++) {
    const n = Number(row.days?.[i] ?? 0);
    days[i] = Number.isInteger(n)
      ? Math.min(readingPlanLength(i), Math.max(0, n))
      : 0;
  }
  return {
    devotionalDay:
      Number.isInteger(row.devotionalDay) && Number(row.devotionalDay) >= 0
        ? Math.min(7, Number(row.devotionalDay))
        : null,
    active:
      Number.isInteger(row.active) &&
      Number(row.active) >= 0 &&
      Number(row.active) <= readingPlans.length
        ? Number(row.active)
        : null,
    started: [
      ...new Set([
        ...(Array.isArray(row.started) ? row.started : []),
        ...(Number.isInteger(row.active) ? [Number(row.active)] : []),
        ...Object.keys(days)
          .map(Number)
          .filter((i) => days[i] > 0),
      ]),
    ].filter((i) => Number.isInteger(i) && i >= 0 && i <= readingPlans.length),
    days,
  };
}

// The final library item follows the actual selected edition's canon, rather
// than imposing the Protestant 66-book ordering on Catholic/Orthodox readers.
export const yearPlanIndex = readingPlans.length;
export function readingPlanLength(plan: number) {
  return plan === yearPlanIndex ? 365 : (readingPlans[plan]?.length ?? 0);
}
export function yearDayPassages(
  books: { code: string; chapters: number }[],
  day: number,
): PlanPassage[] {
  if (!Number.isInteger(day) || day < 0 || day >= 365) return [];
  const all = books.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, i) => ({
      book: book.code,
      chapter: i + 1,
    })),
  );
  return all.slice(
    Math.floor((day * all.length) / 365),
    Math.floor(((day + 1) * all.length) / 365),
  );
}
// Library shelves for the plan filters, in plan order. Bible in a Year sits
// outside every shelf and shows under "All".
export type PlanGroup = "gospels" | "letters" | "stories" | "themes";
export const planGroups: PlanGroup[] = [
  "gospels",
  "themes",
  "gospels",
  "letters",
  "stories",
  "themes",
  "gospels",
  "gospels",
  "stories",
  "stories",
  "letters",
  "letters",
  "themes",
  "stories",
];
export const planFilters = [
  "all",
  "short",
  "gospels",
  "letters",
  "stories",
  "themes",
] as const;
export type PlanFilter = (typeof planFilters)[number];
export function planMatches(plan: number, filter: PlanFilter) {
  if (filter === "all") return true;
  if (filter === "short") return readingPlanLength(plan) <= 7;
  return planGroups[plan] === filter;
}
