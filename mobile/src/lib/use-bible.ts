import { useEffect, useState } from "react";
import { ensureCollection, readingLocation, type CollectionId } from "./bible";

// Bible text loads on first use. Screens that show a verse from a link wait
// for its Bible with this, then read the verse as usual.
export function useBibleFor(verseId?: string | null) {
  const collection: CollectionId | undefined = verseId
    ? readingLocation(verseId)?.collection
    : undefined;
  const [ready, setReady] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (collection)
      void ensureCollection(collection)
        .then(() => {
          if (active) setReady(collection);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [collection]);
  return !collection || ready === collection;
}
