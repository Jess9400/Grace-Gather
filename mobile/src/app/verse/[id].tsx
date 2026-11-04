import { useState } from "react";
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
  studyFor,
  getBook,
  readingLocation,
  chapterSource,
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
  return <StudyPage key={id} id={id} />;
}
function StudyPage({ id }: { id: string }) {
  const { profile } = useApp(),
    lang = profile.language;
  const [layer, setLayer] = useState<Layer | null>(null);
  const reducedMotion = useReducedMotion();
  const verse = getReadingVerse(id),
    study = studyFor(id);
  if (!verse)
    return (
      <SafeAreaView style={s.safe}>
        <Button
          title="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")
          }
        />
        <Body>This passage is unavailable.</Body>
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
    ? "This is Psalm 33 in this edition, corresponding to Psalm 34 in Hebrew-based numbering."
    : study?.editionId === "brenton" && location?.code === "PSA"
      ? "Psalm numbers follow the Septuagint edition shown above."
      : "";
  const question =
    study?.question ??
    "What do I notice in this passage, and what question would I like to carry with me?";
  const options = [
    {
      id: "simple" as const,
      icon: "leaf-outline" as const,
      hint: "A gentle place to begin",
    },
    {
      id: "deeper" as const,
      icon: "layers-outline" as const,
      hint: "Context, meaning and daily life",
    },
    {
      id: "theology" as const,
      icon: "sparkles-outline" as const,
      hint: "Explore questions of faith",
    },
  ];
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/bible")
            }
            style={s.back}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.eyebrow}>BIBLE STUDY</Text>
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
            <Body>Publisher note</Body>
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
          <Disclosure title="Read the whole chapter">
            <ChapterWindow
              title={`${book?.book.name} ${location?.chapter}`}
              verses={chapterVerses}
              selectedNumber={selectedNumber}
            />
            {location && (
              <External
                title="Chapter source"
                url={chapterSource(
                  location.code,
                  location.chapter,
                  location.collection,
                )}
              />
            )}
          </Disclosure>
        )}
        <Button
          secondary
          title="Discuss this verse"
          onPress={() =>
            router.push({ pathname: "/community", params: { verse: id } })
          }
        />
        <View style={s.further}>
          <Text style={s.eyebrow}>AT YOUR OWN PACE</Text>
          <Disclosure title="Sit with a question">
            <Text style={s.question}>{question}</Text>
            <Button
              secondary
              title="Write in my diary"
              onPress={() => router.push("/(tabs)/diary")}
            />
          </Disclosure>
          <Disclosure title={q(lang, "library")}>
            <Button
              secondary
              title="Explore Bible study courses"
              onPress={() =>
                router.push({
                  pathname: "/library",
                  params: { view: "courses", category: "theology" },
                })
              }
            />
            <Button
              secondary
              title="Browse book suggestions"
              onPress={() =>
                router.push({ pathname: "/library", params: { view: "books" } })
              }
            />
          </Disclosure>
          {verse.notes.length > 0 && (
            <Disclosure title="Translation notes">
              {verse.notes.map((note, i) => (
                <Body small key={i}>
                  {note}
                </Body>
              ))}
            </Disclosure>
          )}
          <Disclosure title="Sources and study notes">
            <Body small>
              {study
                ? "Editorial reflections are separate from Scripture. They are in English and await theological review. Notes match explicitly identified passages and do not represent approval by a church."
                : q(lang, "studyLimited")}
            </Body>
            {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
            <External title="Read the source passage" url={verse.sourceUrl} />
            {study?.guide && (
              <External
                title="Further reading at BibleProject"
                url={study.guide}
              />
            )}
            <Body small>{verse.attribution}</Body>
            <External title="License and attribution" url={verse.licenseUrl} />
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
                accessibilityLabel="Back to study options"
                onPress={() => setLayer(null)}
                style={s.back}
              >
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
                <Text style={s.backText}>Back</Text>
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
                  {verse.text || "Publisher note"}
                </Text>
                <Text style={s.edition}>{verse.editionName}</Text>
              </View>
              {layer === "simple" ? (
                <>
                  <Section title="In simple words">
                    {study?.simple ??
                      "A verse-specific explanation is still being prepared. Read the words before and after this verse. Notice who is speaking, what is happening, and which words repeat."}
                  </Section>
                  {!study && verse.context && (
                    <Paragraph>
                      {verse.context[lang] ?? verse.context.en}
                    </Paragraph>
                  )}
                  <Section title="A small response" tint>
                    {study?.today ??
                      "Choose one word or image that stays with you. Give it a little attention before deciding what it means for your own life."}
                  </Section>
                </>
              ) : layer === "deeper" ? (
                <>
                  <Section title="The story around these words">
                    {study?.context ??
                      verse.context?.[lang] ??
                      verse.context?.en ??
                      "Read the surrounding chapter. What kind of writing is this: a story, a song, a letter, a law, or a vision? How does this verse fit the passage around it?"}
                  </Section>
                  {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
                  <Section title="What it means" tint>
                    {study?.meaning ??
                      "Look for repeated words, contrasts and changes of speaker. Read a difficult line in the flow of the whole passage before deciding what it means. These are reading questions, not a completed commentary on this verse."}
                  </Section>
                  <Section title="In everyday life">
                    {study?.today ??
                      "What response might fit the passage as a whole? Notice the difference between what the text says and a personal association it brings to mind. You can hold a question without needing an immediate answer."}
                  </Section>
                </>
              ) : layer === "theology" ? (
                <>
                  <Text accessibilityRole="header" style={s.sectionTitle}>
                    {study
                      ? "What this says about God"
                      : "Questions about God and faith"}
                  </Text>
                  {(
                    study?.theology ??
                    "What does this passage say about God, people, and their relationship? What is being promised, asked, or questioned?\n\nRead the surrounding passage before drawing a conclusion. Christians may read difficult passages differently; a reflection question cannot settle those differences."
                  )
                    .split("\n\n")
                    .map((paragraph, i) => (
                      <Paragraph key={i}>{paragraph}</Paragraph>
                    ))}
                  <Section title="A question to carry" tint>
                    {question}
                  </Section>
                </>
              ) : null}
              <Body small>
                {study
                  ? "A Christian reflection, separate from Scripture. Traditions may understand some details differently."
                  : q(lang, "studyLimited")}
              </Body>
              <Button
                secondary
                title="Back to study options"
                onPress={() => setLayer(null)}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
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
