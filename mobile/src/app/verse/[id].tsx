import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Glass,
  Body,
  Button,
  Row,
  Chip,
  External,
  colors,
  serif,
} from "../../components/quiet-ui";
import {
  getReadingVerse,
  studyFor,
  getBook,
  readingLocation,
} from "../../lib/bible";
import { useApp } from "../../lib/state";
import { q } from "../../lib/quiet-copy";
export default function VerseStudy() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { profile } = useApp();
  const [layer, setLayer] = useState<"simple" | "deeper" | "theology">(
      "simple",
    ),
    [context, setContext] = useState(false);
  const verse = getReadingVerse(id),
    study = studyFor(id),
    lang = profile.language;
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
  const explanation = study
    ? layer === "simple"
      ? study.simple
      : layer === "deeper"
        ? study.context + "\n\n" + study.meaning
        : study.theology
    : layer === "simple"
      ? "What is happening in this verse? Read the sentences before and after it. Notice who is speaking, and to whom."
      : layer === "deeper"
        ? "What kind of writing is this: poetry, narrative, a letter, or another genre? What does the surrounding chapter reveal about its setting and purpose?"
        : "What does this passage say about God, people, and their relationship? Christian traditions may interpret it differently. This is a question for study, not an approved doctrinal commentary.";
  return (
    <Screen back>
      <Glass style={s.card}>
        <Text style={s.reference}>{verse.reference}</Text>
        {verse.text ? (
          <Text style={s.quote}>{verse.text}</Text>
        ) : (
          <Body>Publisher note</Body>
        )}
        <Body small>{verse.editionName}</Body>
      </Glass>
      <Row>
        {(["simple", "deeper", "theology"] as const).map((mode) => (
          <Chip
            key={mode}
            title={q(lang, mode)}
            selected={layer === mode}
            onPress={() => setLayer(mode)}
          />
        ))}
      </Row>
      <View style={{ gap: 18 }}>
        <Body>{explanation}</Body>
        {!study && verse.context && (
          <Body>{verse.context[lang] ?? verse.context.en}</Body>
        )}
        <Body small>{q(lang, "studyLimited")}</Body>
      </View>
      {chapterVerses && (
        <>
          <Button
            secondary
            title={q(lang, "read")}
            onPress={() => setContext(!context)}
          />
          {context && (
            <View style={{ gap: 16 }}>
              {chapterVerses.map((v) => (
                <Text
                  key={v.id}
                  selectable
                  style={[
                    s.context,
                    (id.endsWith(":" + v.id) || v.id === id) && {
                      backgroundColor: colors.pale,
                    },
                  ]}
                >
                  {v.number} {v.text}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
      {verse.notes.map((note, i) => (
        <Body small key={i}>
          {note}
        </Body>
      ))}
      <External title={q(lang, "source")} url={verse.sourceUrl} />
      {study && "guide" in study && study.guide && (
        <External title="BibleProject" url={study.guide} />
      )}
      <Body small>{verse.attribution}</Body>
      <External title="License and attribution" url={verse.licenseUrl} />
    </Screen>
  );
}
const s = StyleSheet.create({
  card: { padding: 25, gap: 20 },
  reference: { color: colors.goldInk, fontSize: 13 },
  quote: { fontFamily: serif, fontSize: 28, lineHeight: 43, color: colors.ink },
  context: {
    fontFamily: serif,
    fontSize: 20,
    lineHeight: 33,
    color: colors.ink,
    padding: 6,
  },
});
