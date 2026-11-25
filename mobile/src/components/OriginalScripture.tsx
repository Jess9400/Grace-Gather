import StudyAskAI from "./StudyAskAI";
import { collaborationCopy } from "../lib/study-collaboration-copy";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Body, External, colors, serif } from "./quiet-ui";
import { StudyAction, StudyLink } from "./StudyControls";
import {
  originalChapter,
  wordOccurrences,
  originalManifest,
  canPairOriginal,
  type OriginalWord,
  type OriginalChapter,
} from "../lib/original-scripture";
import { loadStepWords, type StepWord } from "../lib/stepbible";
import { grammarDescription } from "../lib/original-grammar";
import { sourceReference } from "../lib/open-study-notes";
import {
  collections,
  ensureCollection,
  chapterRows,
  type ReadingVerse,
  type CollectionId,
} from "../lib/bible";
import type { Language } from "../lib/content";
import copy from "../lib/original-study-copy.json";
export default function OriginalScripture({
  verse,
  language,
}: {
  verse: ReadingVerse | null;
  language: Language;
}) {
  const c = copy[language];
  const mapped = useMemo(() => {
    if (!verse) return null;
    const mapped = sourceReference(verse.id);
    if (mapped) return mapped;
    // DRA's NT and the WEB NT supplement share standard references here.
    // Source rows with alternate divisions are still withheld from pairing.
    const match = /^(dra|brenton):([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)$/.exec(
      verse.id,
    );
    const nt = [
      "MAT",
      "MRK",
      "LUK",
      "JHN",
      "ACT",
      "ROM",
      "1CO",
      "2CO",
      "GAL",
      "EPH",
      "PHP",
      "COL",
      "1TH",
      "2TH",
      "1TI",
      "2TI",
      "TIT",
      "PHM",
      "HEB",
      "JAS",
      "1PE",
      "2PE",
      "1JN",
      "2JN",
      "3JN",
      "JUD",
      "REV",
    ];
    return match && nt.includes(match[2])
      ? { book: match[2], chapter: Number(match[3]), verse: Number(match[4]) }
      : null;
  }, [verse]);
  const [ref, setRef] = useState(
    () => mapped ?? { book: "JHN", chapter: 1, verse: 1 },
  );
  const [chapter, setChapter] = useState<OriginalChapter | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [picker, setPicker] = useState(false);
  const [word, setWord] = useState<OriginalWord | null>(null);
  const [askWord, setAskWord] = useState<StepWord | null>(null);
  const [lexicon, setLexicon] = useState<StepWord[]>([]);
  const [strong, setStrong] = useState<string | null>(null);
  const [refs, setRefs] = useState<string[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState(false);
  const [refsAttempt, setRefsAttempt] = useState(0);
  const [limit, setLimit] = useState(12);
  const [sources, setSources] = useState(false);
  const [translation, setTranslation] = useState<ReadingVerse | null>(null);
  useEffect(() => {
    let live = true;
    originalChapter(ref.book, ref.chapter)
      .then((value) => {
        if (live) setChapter(value);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [ref.book, ref.chapter, attempt]);
  useEffect(() => {
    let live = true;
    loadStepWords()
      .then((rows) => {
        if (live) setLexicon(rows);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    // These editions share the reference scheme used by the original dataset.
    const edition: CollectionId | null =
      (
        { en: "web", pt: "blivre", es: "rv1909" } as Partial<
          Record<Language, CollectionId>
        >
      )[language] ?? null;
    const same =
      mapped &&
      mapped.book === ref.book &&
      mapped.chapter === ref.chapter &&
      mapped.verse === ref.verse;
    if (same && verse) {
      return;
    }
    if (edition)
      void ensureCollection(edition)
        .then(() => {
          const book = collections[edition].index.books.findIndex(
            (b) => b.code === ref.book,
          );
          const row = chapterRows(book, ref.chapter, edition).find(
            (v) => Number(v.id.split(".").pop()) === ref.verse,
          );
          if (live) setTranslation(row ?? null);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [ref.book, ref.chapter, ref.verse, language, verse, mapped]);
  useEffect(() => {
    let live = true;
    if (!strong) return;
    wordOccurrences(strong)
      .then((value) => {
        if (live) setRefs(value);
      })
      .catch(() => {
        if (live) setRefsError(true);
      })
      .finally(() => {
        if (live) setRefsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [strong, refsAttempt]);
  const changeReference = (next: typeof ref) => {
    if (next.book !== ref.book || next.chapter !== ref.chapter)
      setChapter(null);
    setError(false);
    setWord(null);
    setStrong(null);
    setTranslation(null);
    setRef(next);
  };
  const pairedTranslation =
    mapped &&
    mapped.book === ref.book &&
    mapped.chapter === ref.chapter &&
    mapped.verse === ref.verse
      ? verse
      : translation;
  const bookNames =
    collections[
      ({ en: "web", pt: "blivre", es: "rv1909", ru: "synodal" } as const)[
        language
      ]
    ].index.books;
  const bookName = (code: string) =>
    bookNames.find((book) => book.code === code)?.name ?? code;
  const tokens = chapter?.[String(ref.verse)] ?? [];
  const hebrew = tokens.some((t) => t[2].some((s) => s.startsWith("H")));
  const lexical =
    word?.[2].flatMap((id) => lexicon.filter((row) => row.id === id)) ?? [];
  const jump = (id: string) => {
    const [book, ch, v] = id.split(".");
    changeReference({ book, chapter: Number(ch), verse: Number(v) });
    setWord(null);
    setStrong(null);
  };
  return (
    <View style={s.stack}>
      {askWord && (
        <StudyAskAI
          verse={
            translation ??
            (mapped?.book === ref.book &&
            mapped.chapter === ref.chapter &&
            mapped.verse === ref.verse
              ? verse
              : null)
          }
          word={askWord}
          language={language}
          onClose={() => setAskWord(null)}
        />
      )}
      {verse && !mapped && <Body small>{c.missing}</Body>}
      <Text style={s.label}>{hebrew ? c.hebrew : c.greek}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.choose}
        onPress={() => setPicker(!picker)}
        style={s.selector}
      >
        <Text style={s.heading}>
          {bookName(ref.book)} {ref.chapter}:{ref.verse} ⌄
        </Text>
      </Pressable>
      {picker && (
        <View style={s.stack}>
          <ScrollView horizontal>
            <View style={s.chips}>
              {bookNames
                .filter((book) => book.code in originalManifest.books)
                .map(({ code: book }) => (
                  <Pressable
                    key={book}
                    accessibilityRole="button"
                    accessibilityState={{ selected: book === ref.book }}
                    onPress={() =>
                      changeReference({ book, chapter: 1, verse: 1 })
                    }
                    style={[s.chip, book === ref.book && s.selected]}
                  >
                    <Text style={s.text}>{bookName(book)}</Text>
                  </Pressable>
                ))}
            </View>
          </ScrollView>
          <ScrollView horizontal>
            <View style={s.chips}>
              {(originalManifest.books as Record<string, number[]>)[
                ref.book
              ].map((ch) => (
                <Pressable
                  key={ch}
                  accessibilityRole="button"
                  onPress={() =>
                    changeReference({ ...ref, chapter: ch, verse: 1 })
                  }
                  style={[s.chip, ch === ref.chapter && s.selected]}
                >
                  <Text style={s.text}>{ch}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={s.chips}>
            {Object.keys(chapter ?? {}).map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                onPress={() => {
                  changeReference({ ...ref, verse: Number(v) });
                  setPicker(false);
                }}
                style={[s.chip, Number(v) === ref.verse && s.selected]}
              >
                <Text style={s.text}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {!chapter && !error && <ActivityIndicator color={colors.goldInk} />}
      {error && (
        <>
          <Body>{c.error}</Body>
          <StudyAction
            title={c.retry}
            onPress={() => {
              setError(false);
              setAttempt(attempt + 1);
            }}
          />
        </>
      )}
      {chapter && (
        <>
          <Body small>{c.tap}</Body>
          <View style={[s.words, hebrew && s.rtl]}>
            {tokens.map((token, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${token[0]} · ${token[1]}`}
                accessibilityState={{ selected: word === token }}
                onPress={() => {
                  setWord(token);
                  setStrong(null);
                }}
                style={[s.token, word === token && s.tokenSelected]}
              >
                <Text style={[s.original, hebrew && s.hebrew]}>{token[0]}</Text>
              </Pressable>
            ))}
          </View>
          {!tokens.length && <Body>{c.missing}</Body>}
          {pairedTranslation && canPairOriginal(tokens) && (
            <View style={s.quote}>
              <Text style={s.label}>
                {c.parallel} · {pairedTranslation.editionName}
              </Text>
              <Body>{pairedTranslation.text}</Body>
              <Body small>{pairedTranslation.reference}</Body>
            </View>
          )}
          {tokens.length > 0 && !canPairOriginal(tokens) && (
            <Body small>{c.numbering}</Body>
          )}
        </>
      )}
      {word && (
        <View style={s.detail}>
          <Text style={s.heading}>{word[0]}</Text>
          <Text style={s.label}>{c.pronunciation}</Text>
          <Body>{word[1]}</Body>
          <Text style={s.label}>{c.dictionary}</Text>
          {lexical.length ? (
            lexical.map((row) => (
              <View key={row.id}>
                <Body>
                  {row.word} · {row.id}
                </Body>
                <Body>{row.gloss}</Body>
                <StudyLink
                  title={collaborationCopy(language).askAI}
                  icon="chatbubbles-outline"
                  onPress={() => setAskWord(row)}
                />
              </View>
            ))
          ) : (
            <Body>{word[5] || c.empty}</Body>
          )}
          <Text style={s.label}>{c.grammar}</Text>
          <Body>{grammarDescription(word[3], language) || word[3]}</Body>
          <Body small>{word[3]}</Body>
          <Body small>{c.notice}</Body>
          {word[2].map((id) => (
            <StudyLink
              key={id}
              title={`${c.concordance} · ${id}`}
              icon="git-branch-outline"
              onPress={() => {
                setRefs([]);
                setLimit(12);
                setRefsError(false);
                setRefsLoading(strong !== id);
                setStrong(strong === id ? null : id);
              }}
            />
          ))}
          {refsLoading && <ActivityIndicator color={colors.goldInk} />}
          {refsError && (
            <StudyAction
              title={c.retry}
              onPress={() => {
                setRefsError(false);
                setRefsLoading(true);
                setRefsAttempt(refsAttempt + 1);
              }}
            />
          )}
          {strong && !refsLoading && !refsError && (
            <>
              <Body small>
                {refs.length} {c.occurrences}
              </Body>
              <View style={s.chips}>
                {refs.slice(0, limit).map((id) => (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    onPress={() => jump(id)}
                    style={s.chip}
                  >
                    <Text style={s.text}>
                      {bookName(id.split(".")[0])}{" "}
                      {id.split(".").slice(1).join(":")}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {refs.length > limit && (
                <StudyAction
                  secondary
                  title={c.more}
                  onPress={() => setLimit(limit + 24)}
                />
              )}
            </>
          )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: sources }}
        onPress={() => setSources(!sources)}
      >
        <Text style={s.foot}>{c.source} ⌄</Text>
      </Pressable>
      {sources && (
        <>
          <Body small>{originalManifest.attribution}</Body>
          <Body small>{originalManifest.changes}</Body>
          <External
            title="STEPBible · CC BY 4.0"
            url={originalManifest.source}
          />
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  stack: { gap: 16 },
  label: { fontSize: 13, color: colors.muted },
  heading: { fontFamily: serif, fontSize: 25, color: colors.ink },
  selector: { paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { padding: 12, borderRadius: 12, backgroundColor: colors.white },
  selected: { borderWidth: 1, borderColor: colors.gold },
  text: { color: colors.ink, fontSize: 15 },
  words: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  rtl: { flexDirection: "row-reverse" },
  token: { paddingHorizontal: 5, paddingVertical: 7, borderRadius: 8 },
  tokenSelected: { backgroundColor: colors.white },
  original: { fontSize: 27, color: colors.ink },
  hebrew: { writingDirection: "rtl", fontSize: 31 },
  detail: {
    gap: 12,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: 20,
  },
  quote: {
    gap: 9,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    paddingLeft: 16,
  },
  foot: { fontSize: 12, color: colors.muted, paddingVertical: 10 },
});
