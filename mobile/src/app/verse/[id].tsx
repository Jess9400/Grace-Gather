import { setStudyDiscussionTopic } from "../../lib/study-discussion-draft";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import {
  Body,
  Button,
  External,
  colors,
  serif,
} from "../../components/quiet-ui";
import ChapterWindow from "../../components/ChapterWindow";
import {
  getReadingVerse,
  ensureCollection,
  studyFor,
  getBook,
  readingLocation,
  chapterSource,
  discussionVerseId,
  collections,
  type CollectionId,
} from "../../lib/bible";
import type { Language } from "../../lib/content";
import {
  journalScripture,
  journalStudyReference,
  themeReferenceFor,
} from "../../lib/journal-verse-reference";
import {
  journalVerseStudy,
  type JournalVerseStudy,
} from "../../lib/journal-verse-studies";
import { useApp } from "../../lib/state";
import { fromVerseRoute } from "../../lib/verse-route";
import { q } from "../../lib/quiet-copy";
import { useReducedMotion } from "../../lib/use-reduced-motion";
type Layer = "simple" | "deeper" | "theology";
// The fuller study notes add these to the basic explanation. Every claim in
// them is drawn from the sources they list.
interface RichStudy {
  words?: { term: string; original: string; meaning: string }[];
  echoes?: { reference: string; text?: string; note?: string }[];
  teaching?: { title: string; text: string }[];
  differences?: { title: string; text: string }[];
  sources?: { label: string; url?: string }[];
}
// A sourced journal note in the shape the screen shows: related verses are
// read from the reader's own Bible (Greek/Latin Psalm numbers included).
function journalRich(
  note: JournalVerseStudy | undefined,
  collection: CollectionId | undefined,
  language: Language,
): RichStudy | undefined {
  if (!note?.sources?.length) return undefined;
  const fallbackBook: Partial<Record<Language, CollectionId>> = {
    en: "web",
    pt: "blivre",
    es: "rv1909",
    ru: "synodal",
  };
  const echoes = note.echoes?.map((echo) => {
    const own =
      collection === "dra" ||
      collection === "brenton" ||
      collection === "synodal"
        ? (echo[collection] ?? echo.ref)
        : echo.ref;
    const found = collection ? getReadingVerse(`${collection}:${own}`) : null;
    if (found) return { reference: found.reference, text: found.text };
    // Passage-only Bibles: name the verse in the reader's language.
    const [code, chapter, number] = echo.ref.split(".");
    const books = collections[fallbackBook[language] ?? "web"].index.books;
    const name = books.find((b) => b.code === code)?.name ?? code;
    return { reference: `${name} ${chapter}:${number}` };
  });
  return {
    words: note.words?.length ? note.words : undefined,
    echoes: echoes?.length ? echoes : undefined,
    teaching: note.teaching?.length ? note.teaching : undefined,
    differences: note.differences?.length ? note.differences : undefined,
    sources: [
      ...note.sources,
      ...(language === "en"
        ? []
        : [{ label: translatedNote[language] ?? translatedNote.pt ?? "" }]),
    ],
  };
}
const translatedNote: Partial<Record<Language, string>> = {
  pt: "Resumido a partir das edições em inglês listadas acima.",
  es: "Resumido a partir de las ediciones en inglés indicadas arriba.",
  ru: "Пересказано по английским изданиям, перечисленным выше.",
};
function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text selectable style={s.prose}>
      {children}
    </Text>
  );
}
function Section({
  title,
  children,
  tint = false,
}: {
  title: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <View style={[s.section, tint && s.callout]}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {typeof children === "string" ? (
        children
          .split("\n\n")
          .map((paragraph, i) => <Paragraph key={i}>{paragraph}</Paragraph>)
      ) : (
        <Paragraph>{children}</Paragraph>
      )}
    </View>
  );
}
function Heading({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={s.sectionTitle}>
      {children}
    </Text>
  );
}
// The words of the verse in their first language, each with what it means.
function KeyWords({
  title,
  words,
}: {
  title: string;
  words: NonNullable<RichStudy["words"]>;
}) {
  return (
    <View style={s.section}>
      <Heading>{title}</Heading>
      <View style={s.list}>
        {words.map((word) => (
          <View key={word.term} style={s.word}>
            <Text style={s.wordTerm}>{word.term}</Text>
            <Text style={s.wordOriginal}>{word.original}</Text>
            <Text selectable style={s.note}>
              {word.meaning}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
// Other places in Scripture that take this verse up.
function Echoes({
  title,
  echoes,
}: {
  title: string;
  echoes: NonNullable<RichStudy["echoes"]>;
}) {
  return (
    <View style={s.section}>
      <Heading>{title}</Heading>
      <View style={s.list}>
        {echoes.map((echo) => (
          <View key={echo.reference} style={s.echo}>
            <Text style={s.label}>{echo.reference}</Text>
            {!!echo.text && (
              <Text selectable style={s.echoText}>
                {echo.text}
              </Text>
            )}
            {!!echo.note && (
              <Text selectable style={s.note}>
                {echo.note}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
function Points({
  points,
  tint = false,
}: {
  points: { title: string; text: string }[];
  tint?: boolean;
}) {
  return (
    <View style={[s.list, tint && s.callout]}>
      {points.map((point) => (
        <View key={point.title} style={{ gap: 7 }}>
          <Text accessibilityRole="header" style={s.pointTitle}>
            {point.title}
          </Text>
          <Text selectable style={tint ? s.note : s.prose}>
            {point.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
function Sources({
  title,
  sources,
}: {
  title: string;
  sources: NonNullable<RichStudy["sources"]>;
}) {
  return (
    <View style={s.sources}>
      <Text accessibilityRole="header" style={s.label}>
        {title}
      </Text>
      {sources.map((source) =>
        source.url ? (
          <Text
            key={source.label}
            accessibilityRole="link"
            onPress={() => {
              if (/^https:\/\//.test(source.url ?? ""))
                void Linking.openURL(source.url ?? "");
            }}
            style={s.source}
          >
            {source.label} <Text style={s.sourceLink}>↗</Text>
          </Text>
        ) : (
          <Text key={source.label} style={s.source}>
            {source.label}
          </Text>
        ),
      )}
    </View>
  );
}
// A suggestion for the reader, not part of the explanation: a small card with
// its own label, so it reads as "your turn" rather than more commentary.
function Invitation({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.invitation}>
      <View style={s.invitationHead}>
        <Ionicons name="leaf-outline" size={15} color={colors.goldInk} />
        <Text accessibilityRole="header" style={s.invitationLabel}>
          {title}
        </Text>
      </View>
      <Text selectable style={s.invitationText}>
        {children}
      </Text>
    </View>
  );
}
export default function VerseStudy() {
  // "journal" is the theme verse reference a saved journal entry passes along.
  const { id: route, journal } = useLocalSearchParams<{
    id: string;
    journal?: string;
  }>();
  // Addresses use "~" in place of ":" (see verse-route); old links still work.
  const id = fromVerseRoute(route);
  const tr = useInterfaceCopy();
  const collection = readingLocation(id)?.collection;
  const [loaded, setLoaded] = useState<string | null>(null),
    [failedCollection, setFailed] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (collection)
      void ensureCollection(collection)
        .then(() => {
          if (active) setLoaded(collection);
        })
        .catch(() => {
          if (active) setFailed(collection);
        });
    return () => {
      active = false;
    };
  }, [collection, attempt]);
  if (collection && loaded !== collection)
    return (
      <SafeAreaView style={s.safe}>
        <Button title={tr("Back")} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")} />
        <Body>
          {tr(
            failedCollection === collection
              ? "Could not load this Bible. Please try again."
              : "Loading your Bible…",
          )}
        </Body>
        {failedCollection === collection && (
          <Button
            title={tr("Try again")}
            onPress={() => {
              setFailed(null);
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </SafeAreaView>
    );
  return <StudyPage key={id} id={id} journal={journal} />;
}
function StudyPage({ id, journal }: { id: string; journal?: string }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    lang = profile.language;
  const [layer, setLayer] = useState<Layer | null>(null);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const location = readingLocation(id);
  // Trust the journal's reference only when this is that theme verse here.
  const journalReference = journalStudyReference(id, journal);
  const verse =
    getReadingVerse(id) ??
    (journalReference && location
      ? journalScripture(location.collection, journalReference)
      : null);
  const study = lang === "en" ? studyFor(id) : undefined;
  // Journal verses are explained in every language; other studies are English.
  // A journal theme verse has a note in every language; once that note is
  // rebuilt from sources it is preferred, wherever the verse is opened.
  const journalNote = journalVerseStudy(
    journalReference ?? themeReferenceFor(id),
    lang,
  );
  const sourced = journalNote?.sources?.length ? journalNote : undefined;
  const explanation = sourced ?? study ?? journalNote;
  const rich: RichStudy =
    (sourced && journalRich(sourced, verse?.collection, lang)) ?? study ?? {};
  if (!verse)
    return (
      <SafeAreaView style={s.safe}>
        <Button
          title={tr("Back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")
          }
        />
        <Body>{tr("This passage is unavailable.")}</Body>
      </SafeAreaView>
    );
  const book = location ? getBook(location.code, location.collection) : null,
    chapterVerses = location
      ? book?.chapters[String(location.chapter)]
      : undefined;
  const selectedNumber = chapterVerses?.find(
    (v) =>
      id === v.id ||
      id.endsWith(":" + v.id) ||
      id.endsWith("." + v.number) ||
      id.endsWith("-" + v.number),
  )?.number;
  const psalmNumbering = [
    "brenton-psalm-33-19",
    "dra-psalm-33-19",
    "brenton:PSA.33.19",
    "dra:PSA.33.19",
  ].includes(id)
    ? tr(
        "This is Psalm 33 in this edition, corresponding to Psalm 34 in Hebrew-based numbering.",
      )
    : study?.editionId === "brenton" && location?.code === "PSA"
      ? tr("Psalm numbers follow the Septuagint edition shown above.")
      : "";
  const question =
    explanation?.question ??
    tr(
      "What do I notice in this passage, and what question would I like to carry with me?",
    );
  const options = [
    {
      id: "simple" as const,
      icon: "leaf-outline" as const,
      hint: tr("A gentle place to begin"),
    },
    {
      id: "deeper" as const,
      icon: "layers-outline" as const,
      hint: tr("Context, meaning and daily life"),
    },
    {
      id: "theology" as const,
      icon: "sparkles-outline" as const,
      hint: tr("Explore questions of faith"),
    },
  ];
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={s.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Back")}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/bible")
            }
            style={s.back}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
            <Text style={s.backText}>{tr("Back")}</Text>
          </Pressable>
          <Text style={s.eyebrow}>{tr("BIBLE STUDY")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={tr("Home")}
            onPress={() => router.dismissTo("/(tabs)")} style={s.home}>
            <Ionicons name="home-outline" size={22} color={colors.ink} />
          </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.headingGroup}>
          <Text accessibilityRole="header" style={s.reference}>
            {verse.reference}
          </Text>
          <Text style={s.edition}>{verse.editionName}</Text>
        </View>
        <View style={s.verseCard}>
          {verse.text ? (
            <Text selectable style={s.quote}>
              {verse.text}
            </Text>
          ) : (
            <Body>{tr("Publisher note")}</Body>
          )}
          <View style={s.goldLine} />
          {chapterVerses && (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: chapterOpen }}
                onPress={() => setChapterOpen(!chapterOpen)}
                style={s.footnoteLink}
              >
                <Text style={s.chapterLink}>{tr("Read full chapter")}</Text>
                <Ionicons
                  name={chapterOpen ? "chevron-up" : "arrow-forward"}
                  size={16}
                  color={colors.goldInk}
                />
              </Pressable>
              {chapterOpen && (
                <View style={{ gap: 18, paddingTop: 12 }}>
                  <ChapterWindow
                    title={`${book?.book.name} ${location?.chapter}`}
                    verses={chapterVerses}
                    selectedNumber={selectedNumber}
                  />
                  {location && (
                    <External
                      title={tr("Chapter source")}
                      url={chapterSource(
                        location.code,
                        location.chapter,
                        location.collection,
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        <View style={s.options}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={q(lang, option.id)}
              onPress={() => setLayer(option.id)}
              style={({ pressed }) => [
                s.option,
                pressed && { backgroundColor: colors.pale },
              ]}
            >
              <View style={s.optionIcon}>
                <Ionicons name={option.icon} size={23} color={colors.goldInk} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.optionTitle}>{q(lang, option.id)}</Text>
                <Text style={s.optionHint}>{option.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        <StudyDiscussionActions id={id} reference={verse.reference} />
        <View style={s.further}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: sourcesOpen }}
            onPress={() => setSourcesOpen(!sourcesOpen)}
            style={s.footnoteLink}
          >
            <Text style={s.footnoteText}>{tr("Sources and study notes")}</Text>
            <Ionicons
              name={sourcesOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.muted}
            />
          </Pressable>
          {sourcesOpen && (
            <View style={{ gap: 14 }}>
              {verse.notes.map((note, i) => (
                <Body small key={i}>
                  {note}
                </Body>
              ))}
              <Body small>
                {study
                  ? tr(
                      "Editorial reflections are separate from Scripture. They are in English and await theological review. Notes match explicitly identified passages and do not represent approval by a church.",
                    )
                  : explanation
                    ? tr(
                        "Editorial reflections are separate from Scripture and await theological review. They are written for this verse and do not represent approval by a church.",
                      )
                    : q(lang, "studyLimited")}
              </Body>
              {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
              <External
                title={tr("Read the source passage")}
                url={verse.sourceUrl}
              />
              {study?.guide && (
                <External
                  title={tr("Further reading at BibleProject")}
                  url={study.guide}
                />
              )}
              <Body small>{verse.attribution}</Body>
              <External
                title={tr("License and attribution")}
                url={verse.licenseUrl}
              />
            </View>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={layer !== null}
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={() => setLayer(null)}
      >
        <View style={s.backdrop}>
          <SafeAreaView style={s.sheet} edges={["bottom"]}>
            <View style={s.sheetHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("Back to study options")}
                onPress={() => setLayer(null)}
                style={s.back}
              >
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
                <Text style={s.backText}>{tr("Back")}</Text>
              </Pressable>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.sheetMode}>{layer ? q(lang, layer) : ""}</Text>
                <Text style={s.sheetReference}>{verse.reference}</Text>
              </View>
            </View>
            <ScrollView
              key={layer ?? "closed"}
              contentContainerStyle={s.reading}
              testID="study-reading-panel"
            >
              <View style={s.readingQuote}>
                <Text selectable style={s.smallQuote}>
                  {verse.text || tr("Publisher note")}
                </Text>
                <Text style={s.edition}>{verse.editionName}</Text>
              </View>
              {layer === "simple" ? (
                <>
                  <Section title={tr("In simple words")}>
                    {explanation?.simple ??
                      tr(
                        "A verse-specific explanation is still being prepared. Read the words before and after this verse. Notice who is speaking, what is happening, and which words repeat.",
                      )}
                  </Section>
                  {!explanation && verse.context && (
                    <Paragraph>
                      {verse.context[lang] ?? verse.context.en}
                    </Paragraph>
                  )}
                  <Invitation title={tr("A small response")}>
                    {explanation?.today ??
                      tr(
                        "Choose one word or image that stays with you. Give it a little attention before deciding what it means for your own life.",
                      )}
                  </Invitation>
                </>
              ) : layer === "deeper" ? (
                <>
                  <Section title={tr("The story around these words")}>
                    {explanation?.context ??
                      verse.context?.[lang] ??
                      verse.context?.en ??
                      tr(
                        "Read the surrounding chapter. What kind of writing is this: a story, a song, a letter, a law, or a vision? How does this verse fit the passage around it?",
                      )}
                  </Section>
                  {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
                  {!!rich.words && (
                    <KeyWords title={tr("Key words")} words={rich.words} />
                  )}
                  <Section title={tr("What it means")} tint>
                    {explanation?.meaning ??
                      tr(
                        "Look for repeated words, contrasts and changes of speaker. Read a difficult line in the flow of the whole passage before deciding what it means. These are reading questions, not a completed commentary on this verse.",
                      )}
                  </Section>
                  {!!rich.echoes && (
                    <Echoes
                      title={tr("Where Scripture picks this up")}
                      echoes={rich.echoes}
                    />
                  )}
                  <Invitation title={tr("In everyday life")}>
                    {explanation?.today ??
                      tr(
                        "What response might fit the passage as a whole? Notice the difference between what the text says and a personal association it brings to mind. You can hold a question without needing an immediate answer.",
                      )}
                  </Invitation>
                </>
              ) : layer === "theology" ? (
                <>
                  <Text accessibilityRole="header" style={s.sectionTitle}>
                    {explanation
                      ? tr("What this says about God")
                      : tr("Questions about God and faith")}
                  </Text>
                  {rich.teaching ? (
                    <Points points={rich.teaching} />
                  ) : (
                    (
                      explanation?.theology ??
                      tr(
                        "What does this passage say about God, people, and their relationship? What is being promised, asked, or questioned?\n\nRead the surrounding passage before drawing a conclusion. Christians may read difficult passages differently; a reflection question cannot settle those differences.",
                      )
                    )
                      .split("\n\n")
                      .map((paragraph, i) => (
                        <Paragraph key={i}>{paragraph}</Paragraph>
                      ))
                  )}
                  {!!rich.differences && (
                    <>
                      <Heading>{tr("Where Christians differ")}</Heading>
                      <Points points={rich.differences} tint />
                    </>
                  )}
                  <Invitation title={tr("A question to carry")}>
                    {question}
                  </Invitation>
                </>
              ) : null}
              {!!rich.sources && (
                <Sources title={tr("Sources")} sources={rich.sources} />
              )}
              <Body small>
                {explanation
                  ? tr(
                      "A Christian reflection, separate from Scripture. Traditions may understand some details differently.",
                    )
                  : q(lang, "studyLimited")}
              </Body>
              <StudyDiscussionActions
                id={id}
                reference={verse.reference}
                beforeNavigate={() => setLayer(null)}
              />
              <Button
                secondary
                title={tr("Back to study options")}
                onPress={() => setLayer(null)}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function StudyDiscussionActions({
  id,
  reference,
  beforeNavigate,
}: {
  id: string;
  reference: string;
  beforeNavigate?: () => void;
}) {
  const tr = useInterfaceCopy();
  return (
    <View>
      <StudyAction
        icon="people-outline"
        title={tr("Open a public discussion")}
        onPress={() => {
          setStudyDiscussionTopic(reference);
          beforeNavigate?.();
          router.push({
            pathname: "/community",
            params: {
              compose: "1",
              verse: discussionVerseId(id) ?? undefined,
            },
          });
        }}
      />
    </View>
  );
}
function StudyAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.option,
        pressed && { backgroundColor: colors.pale },
      ]}
    >
      <View style={s.optionIcon}>
        <Ionicons name={icon} size={23} color={colors.goldInk} />
      </View>
      <Text style={[s.optionTitle, { flex: 1 }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: {
    padding: 22,
    paddingBottom: 45,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 22,
  },
  home: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    paddingRight: 15,
  },
  backText: { fontSize: 16, color: colors.ink },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.goldInk,
    lineHeight: 18,
  },
  headingGroup: { gap: 9, marginBottom: 22 },
  reference: {
    fontFamily: serif,
    fontSize: 31,
    lineHeight: 40,
    color: colors.ink,
  },
  edition: { fontSize: 11, lineHeight: 18, color: colors.muted },
  verseCard: {
    padding: 24,
    borderWidth: 1,
    borderColor: "#B28A3E35",
    borderRadius: 24,
    backgroundColor: colors.white,
    gap: 22,
  },
  quote: { fontFamily: serif, fontSize: 27, lineHeight: 41, color: colors.ink },
  goldLine: { width: 30, height: 2, backgroundColor: colors.gold },
  options: { marginTop: 22, marginBottom: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    minHeight: 84,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  optionIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
  },
  optionTitle: { fontSize: 20, lineHeight: 27, color: colors.ink },
  optionHint: { fontSize: 12, lineHeight: 19, color: colors.muted },
  further: { marginTop: 30, gap: 10 },
  footnoteLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  chapterLink: { fontSize: 13, lineHeight: 20, color: colors.goldInk },
  footnoteText: { fontSize: 12, lineHeight: 19, color: colors.muted },
  question: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 35,
    color: colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "94%",
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 19,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  sheetMode: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.goldInk,
    textTransform: "uppercase",
  },
  sheetReference: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 32,
    color: colors.ink,
  },
  reading: { padding: 24, paddingBottom: 45, gap: 25 },
  readingQuote: {
    padding: 21,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  smallQuote: {
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 35,
    color: colors.ink,
  },
  section: { gap: 13 },
  sectionTitle: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.ink,
  },
  prose: { fontFamily: serif, fontSize: 18, lineHeight: 29, color: colors.ink },
  callout: { padding: 22, borderRadius: 21, backgroundColor: colors.pale },
  list: { gap: 18 },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.goldInk,
  },
  note: { fontSize: 16, lineHeight: 25, color: colors.ink },
  word: {
    gap: 5,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#B28A3E8C",
  },
  wordTerm: {
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 27,
    color: colors.ink,
  },
  wordOriginal: { fontSize: 14, lineHeight: 20, color: colors.goldInk },
  echo: { gap: 6 },
  echoText: {
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 19,
    lineHeight: 29,
    color: colors.ink,
  },
  pointTitle: {
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 28,
    color: colors.ink,
  },
  sources: {
    gap: 9,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  source: { fontSize: 13, lineHeight: 19, color: colors.muted },
  sourceLink: { color: colors.goldInk, fontWeight: "700" },
  invitation: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#B28A3E66",
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  invitationHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  invitationLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.goldInk,
  },
  invitationText: { fontSize: 16, lineHeight: 24, color: colors.ink },
});
