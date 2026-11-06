import type { Profile } from "./content";

// Western Advent begins on the fourth Sunday before Christmas (between
// 27 November and 3 December) and ends on Christmas Eve. Returns the Advent
// week (1–4) for a date, or 0 outside Advent.
export function westernAdventWeek(date: Date) {
  const year = date.getFullYear();
  const christmas = new Date(year, 11, 25);
  const start = new Date(year, 11, 25 - ((christmas.getDay() || 7) + 21));
  const today = new Date(year, date.getMonth(), date.getDate());
  if (today < start || today >= christmas) return 0;
  const days = Math.round((today.getTime() - start.getTime()) / 86400000);
  return Math.min(4, Math.floor(days / 7) + 1);
}

// The Advent wreath is a Western custom. Orthodox churches keep the Nativity
// Fast on a different calendar, so the wreath is not shown for that choice.
export function adventWeekFor(profile: Profile, date: Date, preview?: number) {
  if (profile.faithChoice === "orthodox" || profile.tradition === "orthodox")
    return 0;
  if (preview !== undefined) return preview;
  return westernAdventWeek(date);
}

export function isEvening(date: Date) {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

export function localDay(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}
