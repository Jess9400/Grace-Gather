// Only selected actions are eligible. Use local calendar days, not a 24-hour
// duration, so an evening action can be followed up the next day.
export function pendingStep(entries, now = new Date()) {
  const localDay = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = localDay(now);
  const ordered = [...entries].sort((a, b) =>
    (b.step?.chosenAt ?? "").localeCompare(a.step?.chosenAt ?? ""),
  );
  for (const entry of ordered) {
    const step = entry.step;
    if (
      !step ||
      step.status ||
      step.checkedAt ||
      entry.sessionOnly ||
      entry.deletedAt
    )
      continue;
    const chosen = new Date(step.chosenAt);
    if (!Number.isFinite(chosen.getTime()) || chosen.getTime() > now.getTime())
      continue;
    if (localDay(chosen) >= today) continue;
    return { entry, step };
  }
  return null;
}
