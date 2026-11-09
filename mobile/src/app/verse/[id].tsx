import StudyChat from "../../components/StudyChat";
import { useCommunity } from "../../lib/discussion-state";
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
import Disclosure from "../../components/Disclosure";
import ChapterWindow from "../../components/ChapterWindow";
import {
  getReadingVerse,
  ensureCollection,
  studyFor,
  getBook,
  readingLocation,
  chapterSource,
  discussionVerseId,
} from "../../lib/bible";
import { useApp } from "../../lib/state";
import { q } from "../../lib/quiet-copy";
import { useReducedMotion } from "../../lib/use-reduced-motion";
type Layer = "simple" | "deeper" | "theology";
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
      <Paragraph>{children}</Paragraph>
    </View>
  );
}
export default function VerseStudy() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        <Button title={tr("Back")} onPress={() => router.back()} />
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
  return <StudyPage key={id} id={id} />;
}
function StudyPage({ id }: { id: string }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    lang = profile.language;
  const [layer, setLayer] = useState<Layer | null>(null);
  const reducedMotion = useReducedMotion();
  const verse = getReadingVerse(id),
    study = lang === "en" ? studyFor(id) : undefined;
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
  const location = readingLocation(id),
    book = location ? getBook(location.code, location.collection) : null,
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
    study?.question ??
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
      <ScrollView contentContainerStyle={s.page}>
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
        </View>
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
        {chapterVerses && (
          <Disclosure title={tr("Read the whole chapter")}>
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
          </Disclosure>
        )}
        <StudyDiscussionActions id={id} reference={verse.reference} />
        <View style={s.further}>
          <Text style={s.eyebrow}>{tr("AT YOUR OWN PACE")}</Text>
          <Disclosure title={tr("Sit with a question")}>
            <Text style={s.question}>{question}</Text>
            <Button
              secondary
              title={tr("Write in my diary")}
              onPress={() => router.push("/(tabs)/diary")}
            />
          </Disclosure>
          <Disclosure title={q(lang, "library")}>
            <Button
              secondary
              title={tr("Explore Bible study courses")}
              onPress={() =>
                router.push({
                  pathname: "/library",
                  params: { view: "courses", category: "theology" },
                })
              }
            />
            <Button
              secondary
              title={tr("Browse book suggestions")}
              onPress={() =>
                router.push({ pathname: "/library", params: { view: "books" } })
              }
            />
          </Disclosure>
          {verse.notes.length > 0 && (
            <Disclosure title={tr("Translation notes")}>
              {verse.notes.map((note, i) => (
                <Body small key={i}>
                  {note}
                </Body>
              ))}
            </Disclosure>
          )}
          <Disclosure title={tr("Sources and study notes")}>
            <Body small>
              {study
                ? tr(
                    "Editorial reflections are separate from Scripture. They are in English and await theological review. Notes match explicitly identified passages and do not represent approval by a church.",
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
          </Disclosure>
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
                    {study?.simple ??
                      tr(
                        "A verse-specific explanation is still being prepared. Read the words before and after this verse. Notice who is speaking, what is happening, and which words repeat.",
                      )}
                  </Section>
                  {!study && verse.context && (
                    <Paragraph>
                      {verse.context[lang] ?? verse.context.en}
                    </Paragraph>
                  )}
                  <Section title={tr("A small response")} tint>
                    {study?.today ??
                      tr(
                        "Choose one word or image that stays with you. Give it a little attention before deciding what it means for your own life.",
                      )}
                  </Section>
                </>
              ) : layer === "deeper" ? (
                <>
                  <Section title={tr("The story around these words")}>
                    {study?.context ??
                      verse.context?.[lang] ??
                      verse.context?.en ??
                      tr(
                        "Read the surrounding chapter. What kind of writing is this: a story, a song, a letter, a law, or a vision? How does this verse fit the passage around it?",
                      )}
                  </Section>
                  {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
                  <Section title={tr("What it means")} tint>
                    {study?.meaning ??
                      tr(
                        "Look for repeated words, contrasts and changes of speaker. Read a difficult line in the flow of the whole passage before deciding what it means. These are reading questions, not a completed commentary on this verse.",
                      )}
                  </Section>
                  <Section title={tr("In everyday life")}>
                    {study?.today ??
                      tr(
                        "What response might fit the passage as a whole? Notice the difference between what the text says and a personal association it brings to mind. You can hold a question without needing an immediate answer.",
                      )}
                  </Section>
                </>
              ) : layer === "theology" ? (
                <>
                  <Text accessibilityRole="header" style={s.sectionTitle}>
                    {study
                      ? tr("What this says about God")
                      : tr("Questions about God and faith")}
                  </Text>
                  {(
                    study?.theology ??
                    tr(
                      "What does this passage say about God, people, and their relationship? What is being promised, asked, or questioned?\n\nRead the surrounding passage before drawing a conclusion. Christians may read difficult passages differently; a reflection question cannot settle those differences.",
                    )
                  )
                    .split("\n\n")
                    .map((paragraph, i) => (
                      <Paragraph key={i}>{paragraph}</Paragraph>
                    ))}
                  <Section title={tr("A question to carry")} tint>
                    {question}
                  </Section>
                </>
              ) : null}
              <Body small>
                {study
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
  const { profile } = useApp();
  const { userId } = useCommunity();
  return (
    <View style={{ gap: 12 }}>
      <Disclosure title={tr("Discuss with AI")}>
        <StudyChat
          key={`${userId}:${id}:${profile.language}:${profile.scriptureLanguage}:${profile.tradition}:${profile.edition}`}
          initialQuestion={`${reference}: ${tr("What does this passage mean?")}`}
        />
      </Disclosure>
      <Button
        secondary
        title={tr("Open a public discussion")}
        onPress={() => {
          setStudyDiscussionTopic(reference);
          beforeNavigate?.();
          router.push({
            pathname: "/(tabs)/explore",
            params: {
              category: "discussions",
              compose: "1",
              verse: discussionVerseId(id) ?? undefined,
            },
          });
        }}
      />
    </View>
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
    marginBottom: 28,
  },
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
  further: { marginTop: 28, gap: 1 },
  question: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 35,
    color: colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#302C2845",
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
  prose: { fontFamily: serif, fontSize: 20, lineHeight: 33, color: colors.ink },
  callout: { padding: 22, borderRadius: 21, backgroundColor: colors.pale },
});
