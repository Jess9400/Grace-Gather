import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Chip,
  Button,
  Busy,
  Notice,
  External,
  colors,
} from "../../components/quiet-ui";
import { useApp } from "../../lib/state";
import { copy, localized, data } from "../../lib/content";
import { useCatalog } from "../../lib/community";
import { q } from "../../lib/quiet-copy";
export default function Learn() {
  const params = useLocalSearchParams<{
    view?: string;
    category?: string;
    mood?: string;
  }>();
  return (
    <Library
      key={
        (params.view ?? "courses") +
        ":" +
        (params.category ?? "allCourses") +
        ":" +
        (params.mood ?? "")
      }
      params={params}
    />
  );
}
function Library({
  params,
}: {
  params: { view?: string; category?: string; mood?: string };
}) {
  const { profile } = useApp(),
    { items, loading, failed } = useCatalog("course");
  const [tab, setTab] = useState(params.view === "books" ? "books" : "courses"),
    [category, setCategory] = useState(
      params.category === "theology" ? "theology" : "allCourses",
    );
  const t = (key: string) => copy(profile.language, key);
  const books = [...data.BOOKS].sort(
    (a, b) =>
      Number(b.moods.includes(params.mood ?? "")) -
      Number(a.moods.includes(params.mood ?? "")),
  );
  return (
    <Screen back>
      <Heading>{q(profile.language, "library")}</Heading>
      <View accessibilityRole="tablist" style={s.tabs}>
        {(["courses", "books"] as const).map((mode) => (
          <Pressable
            key={mode}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === mode }}
            onPress={() => setTab(mode)}
            style={[s.tab, tab === mode && s.active]}
          >
            <Text
              style={{
                color: tab === mode ? colors.ink : colors.muted,
                fontSize: 17,
              }}
            >
              {q(profile.language, mode)}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "courses" ? (
        <>
          <Body small>{t("learnIntro")}</Body>
          <Row>
            {[
              "allCourses",
              "theology",
              "mindfulness",
              "breathwork",
              "journaling",
              "music",
              "art",
            ].map((c) => (
              <Chip
                key={c}
                title={t(c)}
                selected={c === category}
                onPress={() => setCategory(c)}
              />
            ))}
          </Row>
          {loading && <Busy />}
          <Notice
            text={
              failed
                ? "Showing the bundled courses. The latest catalogue could not be refreshed."
                : ""
            }
          />
          {items
            .filter((c) => category === "allCourses" || c.category === category)
            .map((c) => (
              <Card key={c.id}>
                <Body small>
                  {t("free")} · {t(c.category ?? "course")}
                </Body>
                <Subheading>{localized(c.title, profile.language)}</Subheading>
                <Body>{localized(c.summary, profile.language)}</Body>
                <Body small>
                  {c.provider} · {c.lang}
                </Body>
                <Button
                  secondary
                  title={t("viewCourse")}
                  onPress={() =>
                    router.push({
                      pathname: "/course/[id]",
                      params: { id: c.id },
                    })
                  }
                />
              </Card>
            ))}
          <Body small>{t("courseNote")}</Body>
        </>
      ) : (
        <>
          <Body small>{t("pBookIntro")}</Body>
          {books.map((book) => (
            <Card key={book.id}>
              <Body small>{book.language}</Body>
              <Subheading>{book.title}</Subheading>
              <Body small>{book.author}</Body>
              <Body>{localized(book.note, profile.language)}</Body>
              <External title={t("pBookSource")} url={book.url} />
            </Card>
          ))}
          <Body small>{t("pBookNote")}</Body>
        </>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  active: { borderBottomColor: colors.ink },
});
