/** A versioned journal document. Only the signed-in owner's document is used. */
export type JournalDocument<T> = { revision: number; entries: T[] };

export interface JournalDocumentStore<T> {
  read(): Promise<JournalDocument<T> | null>;
  // Return false if another device created or changed the document first.
  create(entries: T[]): Promise<boolean>;
  replace(expectedRevision: number, entries: T[]): Promise<boolean>;
}

/** Reapply the operation to a fresh document when another device writes first. */
export async function updateAccountJournal<T>(
  store: JournalDocumentStore<T>,
  change: (entries: T[]) => T[],
): Promise<T[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.read();
    const next = change(current?.entries ?? []);
    const saved = current
      ? await store.replace(current.revision, next)
      : await store.create(next);
    if (saved) return next;
  }
  throw new Error("journal_sync_conflict");
}
