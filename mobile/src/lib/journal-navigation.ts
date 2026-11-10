// Pass only the entry ID, never journal writing, to the Confession tab.
export function confessionJournalTarget(entryId: string, action: "A04" | "A14") {
  return {
    pathname: "/(tabs)/confession" as const,
    params: action === "A14" ? { returnEntry: entryId, view: "comfort" } : { returnEntry: entryId },
  };
}
export function journalReturnId(value: unknown, entries: { id: string }[]) {
  return typeof value === "string" && entries.some(entry => entry.id === value) ? value : undefined;
}
