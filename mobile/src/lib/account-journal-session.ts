/** Reject late reads when an account signs out or another account signs in. */
export function createJournalSessionGate() {
  let owner: string | null = null;
  let generation = 0;
  return {
    switchOwner(next: string | null) {
      owner = next;
      generation += 1;
    },
    capture() {
      const expectedOwner = owner;
      const expectedGeneration = generation;
      return {
        owner: expectedOwner,
        current: () =>
          expectedOwner !== null &&
          owner === expectedOwner &&
          generation === expectedGeneration,
      };
    },
  };
}

/** Import only new IDs after a person explicitly chooses an account. */
export function planJournalImport<T extends { id: string }>(
  account: T[],
  device: T[],
) {
  const known = new Set(account.map((entry) => entry.id));
  const additions: T[] = [];
  const conflicts: string[] = [];
  for (const entry of device) {
    if (known.has(entry.id)) {
      conflicts.push(entry.id);
      continue;
    }
    known.add(entry.id);
    additions.push(entry);
  }
  return { entries: [...account, ...additions], conflicts };
}
