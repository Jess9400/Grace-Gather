import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { collectionFor, ensureCollection, getReadingVerse, type ReadingVerse } from "../lib/bible";
import { searchBible } from "../lib/bible-search";
import { useApp } from "../lib/state";
import { useBibleFor } from "../lib/use-bible";
import { colors, serif } from "./quiet-ui";

// Use the exact edition and verse linked to the discussion; never substitute
// a passage from another translation when the source isn't available.
export default function DiscussionVerse({ id, reference, fallbackTitle, compact = false }: {
  id?: string; reference?: string; fallbackTitle?: string; compact?: boolean;
}) {
  const { profile } = useApp();
  const collection = collectionFor(profile);
  const [fallback, setFallback] = useState<{ key: string; verse: ReadingVerse | null } | null>(null);
  const ready = useBibleFor(id);
  const candidate = reference || fallbackTitle || "";
  const key = `${collection}:${candidate}`;
  useEffect(() => {
    let active = true;
    // Only an exact single-verse reference can stand in for a missing link.
    if (!id && collection && /^.+\s+\d+:\d+[a-z]?$/i.test(candidate.trim())) {
      void ensureCollection(collection).then(() => {
        const found = searchBible(collection, candidate, 1)[0] ?? null;
        if (active) setFallback({ key, verse: found });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [candidate, collection, id, key]);
  const verse = ready && id ? getReadingVerse(id) : !id && fallback?.key === key ? fallback.verse : null;
  if (!verse) return null;
  return <View style={{ borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 12, gap: 4 }}>
    <Text style={{ color: colors.ink, fontFamily: serif, fontSize: compact ? 16 : 17, lineHeight: compact ? 23 : 25 }}>
      “{verse.text}”
    </Text>
    <Text style={{ color: colors.muted, fontSize: 12 }}>{reference || verse.reference} · {verse.editionName}</Text>
  </View>;
}
