import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  Screen,
  Body,
  Button,
  External,
  colors,
  serif,
} from "../../components/quiet-ui";
import Disclosure from "../../components/Disclosure";
import {
  getReadingVerse,
  studyFor,
  getBook,
  readingLocation,
  chapterSource,
} from "../../lib/bible";
import { useApp } from "../../lib/state";
import { q } from "../../lib/quiet-copy";
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.subheading}>
        {title}
      </Text>
      <Body>{children}</Body>
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
  const [layer, setLayer] = useState<"simple" | "deeper" | "theology">(
    "simple",
  );
  const verse = getReadingVerse(id),
    study = studyFor(id);
  if (!verse)
    return (
      <Screen back>
        <Body>This passage is unavailable.</Body>
      </Screen>
    );
  const location = readingLocation(id),
    book = location ? getBook(location.code, location.collection) : null,
    chapterVerses = location
      ? book?.chapters[String(location.chapter)]
      : undefined;
  const psalmNumbering =
    id === "brenton-psalm-33-19" ||
    id === "dra-psalm-33-19" ||
    id === "brenton:PSA.33.19" ||
    id === "dra:PSA.33.19"
      ? "This is Psalm 33 in this edition, corresponding to Psalm 34 in Hebrew-based numbering."
      : study?.editionId === "brenton" && location?.code === "PSA"
        ? "Psalm numbers follow the Septuagint edition shown above."
        : "";
  const question =
    study?.question ??
    "What do I notice in this passage, and what question would I like to carry with me?";
  return (
    <Screen back>
      <View style={s.paper}>
        <View style={s.opening}>
          <Text style={s.reference}>{verse.reference}</Text>
          {verse.text ? (
            <Text selectable style={s.quote}>
              {verse.text}
            </Text>
          ) : (
            <Body>Publisher note</Body>
          )}
          <Text style={s.edition}>{verse.editionName}</Text>
        </View>
        <View accessibilityRole="tablist" style={s.tabs}>
          {(["simple", "deeper", "theology"] as const).map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="tab"
              accessibilityState={{ selected: layer === mode }}
              onPress={() => setLayer(mode)}
              style={[s.tab, layer === mode && s.activeTab]}
            >
              <Text style={[s.tabText, layer === mode && s.activeText]}>
                {q(lang, mode)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.explanation}>
          {layer === "simple" ? (
            <>
              <Text accessibilityRole="header" style={s.heading}>
                {study ? "In simple words" : "Begin with the passage"}
              </Text>
              <Body>
                {study?.simple ??
                  "A verse-specific explanation is still being prepared. Read the words before and after this verse. Notice who is speaking, what is happening, and which words repeat."}
              </Body>
              {!study && verse.context && (
                <Body>{verse.context[lang] ?? verse.context.en}</Body>
              )}
            </>
          ) : layer === "deeper" ? (
            <>
              <Text accessibilityRole="header" style={s.heading}>
                {study ? "The story around these words" : "Look more closely"}
              </Text>
              <Body>
                {study?.context ??
                  verse.context?.[lang] ??
                  verse.context?.en ??
                  "Read the whole chapter below. What kind of writing is this: a story, a song, a letter, a law, or a vision? How does the verse fit the passage around it?"}
              </Body>
              {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
              <Section title="What it means">
                {study?.meaning ??
                  "Look for repeated words, contrasts and changes of speaker. Read a difficult line in the flow of the whole passage before deciding what it means. These are reading questions, not a completed commentary on this verse."}
              </Section>
              <Section title="In everyday life">
                {study?.today ??
                  "What response might fit the passage as a whole? Notice the difference between what the text says and a personal association it brings to mind. You can hold a question without needing an immediate answer."}
              </Section>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={s.heading}>
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
                  <Body key={i}>{paragraph}</Body>
                ))}
              <Body small>
                A Christian reflection. Traditions may understand some details
                differently.
              </Body>
            </>
          )}
        </View>
        <View style={s.details}>
          {chapterVerses && (
            <Disclosure title="Read the whole chapter" initiallyOpen={!study}>
              <Text style={s.edition}>
                {book?.book.name} {location?.chapter} ·{" "}
                {location?.collection === "dra"
                  ? "Douay-Rheims"
                  : location?.collection === "brenton"
                    ? "Brenton collection"
                    : "World English Bible"}
              </Text>
              {chapterVerses.map((v) => (
                <View key={v.id} style={s.contextRow}>
                  <Text
                    selectable
                    style={[
                      s.context,
                      (verse.reference.includes(`:${v.number} `) ||
                        id.endsWith("." + v.number) ||
                        id.endsWith("-" + v.number)) &&
                        s.highlight,
                    ]}
                  >
                    <Text style={s.verseNumber}>{v.number} </Text>
                    {v.text}
                  </Text>
                  {!v.text &&
                    v.notes.map((note, i) => (
                      <Body small key={i}>
                        {note}
                      </Body>
                    ))}
                </View>
              ))}
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
          <Disclosure title="Sit with a question">
            <Text style={s.question}>{question}</Text>
            <Button
              secondary
              title="Write in my diary"
              onPress={() => router.push("/(tabs)/diary")}
            />
          </Disclosure>
          <Disclosure title="Courses and books">
            <Body small>
              Continue at your own pace with resources already in Grace &
              Gather.
            </Body>
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
                ? "These editorial reflections are separate from Scripture. They are in English and await theological review. Shared notes are connected only to explicitly identified passages; your Bible wording and source stay unchanged."
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
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  paper: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 25,
    overflow: "hidden",
  },
  opening: { padding: 24, gap: 18 },
  reference: { fontSize: 14, color: colors.goldInk },
  quote: { fontFamily: serif, fontSize: 29, lineHeight: 44, color: colors.ink },
  edition: { fontSize: 12, lineHeight: 19, color: colors.muted },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: colors.ink },
  tabText: { fontSize: 15, color: colors.muted },
  activeText: { color: colors.ink, fontWeight: "600" },
  explanation: { padding: 24, gap: 21 },
  heading: {
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 37,
    color: colors.ink,
  },
  section: { gap: 12, marginTop: 5 },
  subheading: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 31,
    color: colors.ink,
  },
  details: { paddingHorizontal: 24 },
  question: {
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 34,
    color: colors.ink,
  },
  contextRow: { gap: 8 },
  context: {
    fontFamily: serif,
    fontSize: 19,
    lineHeight: 32,
    color: colors.ink,
    padding: 7,
  },
  verseNumber: { fontSize: 12, color: colors.goldInk },
  highlight: { backgroundColor: colors.pale, borderRadius: 8 },
});
