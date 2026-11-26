import catalog from "../generated/devotionals/catalog.json";
import schedule from "../generated/devotionals/schedule.json";
import type { Language } from "./content";
export type DailyDevotional = {
  id: string;
  date: string;
  day: number;
  reference: string;
  approved: boolean;
  batch: string;
  status: string;
} & Record<Language, string[]>;
export const devotionalCatalog = catalog as DailyDevotional[];
export const devotionalSchedule = schedule;
export function localDevotionalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function devotionalForDate(date: string) {
  // No modulo, annual restart, locale-specific identity, or unseen-item reshuffle.
  return devotionalCatalog.find((entry) => entry.date === date) ?? null;
}
export function devotionalArchive(
  date: string,
  month: string,
  editorial = false,
) {
  return devotionalCatalog
    .filter(
      (entry) =>
        (entry.date <= date || (editorial && !entry.approved)) &&
        (!month || entry.date.startsWith(month)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function millisecondsUntilNextLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, next.getTime() - date.getTime());
}
export function latestDevotionalForDate(date: string) {
  return (
    devotionalForDate(date) ??
    [...devotionalCatalog]
      .filter((entry) => entry.approved && entry.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ??
    null
  );
}
