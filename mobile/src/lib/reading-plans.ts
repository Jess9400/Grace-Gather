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
  days: Record<number, number>;
};
export function normalizePlanProgress(value: unknown): PlanProgress {
  const row =
    value && typeof value === "object" ? (value as Partial<PlanProgress>) : {};
  const days: Record<number, number> = {};
  for (let i = 0; i < readingPlans.length; i++) {
    const n = Number(row.days?.[i] ?? 0);
    days[i] = Number.isInteger(n)
      ? Math.min(readingPlans[i].length, Math.max(0, n))
      : 0;
  }
  return {
    active:
      Number.isInteger(row.active) &&
      Number(row.active) >= 0 &&
      Number(row.active) < readingPlans.length
        ? Number(row.active)
        : null,
    days,
  };
}
