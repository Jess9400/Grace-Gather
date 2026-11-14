import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { collectionFor, ensureCollection, getReadingVerse, type ReadingVerse } from "../lib/bible";
import { data } from "../lib/content";
import { discussionVerseForLanguage } from "../lib/discussion-verse-language";
import { searchBible } from "../lib/bible-search";
import { useApp } from "../lib/state";
import { useBibleFor } from "../lib/use-bible";
import { colors, serif } from "./quiet-ui";
import { TranslationToggle } from "./TranslatedText";
import { translationCopy } from "../lib/conversation-translations";

// Prefer a genuine edition in the reader's app language. Keep the linked
// original available, and don't guess where verse numbering may differ.
export default function DiscussionVerse({ id, reference, fallbackTitle, compact = false }: {
  id?: string; reference?: string; fallbackTitle?: string; compact?: boolean;
}) {
  const { profile } = useApp();
  const collection = collectionFor(profile);
  const [fallback, setFallback] = useState<{ key: string; verse: ReadingVerse | null } | null>(null);
  const [localized, setLocalized] = useState<{ key: string; verse: ReadingVerse | null } | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(null);
  const ready = useBibleFor(id);
  const candidate = reference || fallbackTitle || "";
  const key = `${collection}:${candidate}`;
  const targetEdition = data.editions.find((edition) => edition.language === profile.language && (edition.traditions as string[]).includes(profile.tradition));
  const localizedKey = `${id}:${targetEdition?.id}`;
  const showOriginal = originalKey === localizedKey;
  useEffect(() => {
    let active = true;
    if (!id || !targetEdition) return;
    const selected = collectionFor({ ...profile, scriptureLanguage: targetEdition.language as typeof profile.language, edition: targetEdition.id });
    const candidateId = discussionVerseForLanguage(id, targetEdition.id, targetEdition.passages, !!selected);
    if (!candidateId) return;
    const read = () => { if (active) setLocalized({ key: localizedKey, verse: getReadingVerse(candidateId) }); };
    if (selected) void ensureCollection(selected).then(read).catch(() => {});
    else read();
    return () => { active = false; };
  }, [id, targetEdition, localizedKey, profile]);
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
  const original = ready && id ? getReadingVerse(id) : !id && fallback?.key === key ? fallback.verse : null;
  const translated = localized?.key === localizedKey ? localized.verse : null;
  const verse = !showOriginal && translated ? translated : original;
  if (!verse) return null;
  return <View style={{ borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 12, gap: 4 }}>
    <Text style={{ color: colors.ink, fontFamily: serif, fontSize: compact ? 16 : 17, lineHeight: compact ? 23 : 25 }}>
      {verse.text}
    </Text>
    <Text style={{ color: colors.muted, fontSize: 12 }}>{verse.reference} · {verse.editionName}</Text>
    {!!translated && !!original && translated.id !== original.id && <TranslationToggle
      title={translationCopy(profile.language, showOriginal ? "translated" : "original")}
      onPress={() => setOriginalKey(showOriginal ? null : localizedKey)} />}
  </View>;
}
