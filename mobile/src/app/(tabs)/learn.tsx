import { useState } from "react";
import { router } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Busy,
  Notice,
  colors,
} from "../../components/ui";
import { FilterStrip } from "../../components/QuietControls";
import { designCopy } from "../../lib/design-copy";
import { useApp } from "../../lib/state";
import { copy, localized } from "../../lib/content";
import { useCatalog } from "../../lib/community";
const icons = {
  theology: "book-outline",
  mindfulness: "leaf-outline",
  breathwork: "water-outline",
  journaling: "create-outline",
  music: "musical-notes-outline",
  art: "color-palette-outline",
} as const;
export default function Learn() {
  const { profile } = useApp(),
    { items, loading, failed } = useCatalog("course");
  const [category, setCategory] = useState("allCourses");
  const t = (k: string) => copy(profile.language, k);
  const d = (key: Parameters<typeof designCopy>[1]) =>
    designCopy(profile.language, key);
  const filtered = items.filter(
    (c) => category === "allCourses" || c.category === category,
  );
  const groups = [
    {
      title: d("scriptureStudy"),
      items: filtered.filter((c) => c.category === "theology"),
    },
    {
      title: d("dailyPractices"),
      items: filtered.filter((c) => c.category !== "theology"),
    },
  ];
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Heading>{t("learn")}</Heading>
        <Body small>{d("studyIntro")}</Body>
      </View>
      <FilterStrip
        options={["allCourses", ...Object.keys(icons)].map((c) => ({
          value: c,
          label: t(c),
        }))}
        value={category}
        onChange={setCategory}
      />
      {loading && <Busy />}
      <Notice text={failed ? t("socialError") : ""} />
      {groups
        .filter((group) => group.items.length)
        .map((group) => (
          <View key={group.title} style={{ gap: 14, paddingTop: 6 }}>
            <Subheading>{group.title}</Subheading>
            {group.items.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`${t("viewCourse")}: ${localized(c.title, profile.language)}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                onPress={() =>
                  router.push({
                    pathname: "/course/[id]",
                    params: { id: c.id },
                  })
                }
              >
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 15,
                    }}
                  >
                    <View
                      accessible={false}
                      style={{
                        width: 66,
                        height: 90,
                        borderRadius: 7,
                        backgroundColor: colors.paper,
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          width: 90,
                          height: 90,
                          borderRadius: 45,
                          borderWidth: 1,
                          borderColor: "#D7BD8450",
                          top: 27,
                          left: 14,
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          width: 90,
                          height: 90,
                          borderRadius: 45,
                          borderWidth: 1,
                          borderColor: "#D7BD8450",
                          top: -28,
                          left: -42,
                        }}
                      />
                      <Ionicons
                        name={
                          icons[c.category as keyof typeof icons] ??
                          "book-outline"
                        }
                        size={27}
                        color={colors.gold}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 7 }}>
                      <Text
                        style={{
                          color: colors.cardMuted,
                          fontSize: 11,
                          fontWeight: "600",
                          letterSpacing: 0.5,
                        }}
                      >
                        {t("free")} · {t(c.category ?? "course")}
                      </Text>
                      <Text
                        style={{
                          color: colors.cardInk,
                          fontSize: 18,
                          lineHeight: 24,
                          fontWeight: "600",
                        }}
                      >
                        {localized(c.title, profile.language)}
                      </Text>
                      <Body small>
                        {c.provider} · {c.lang}
                      </Body>
                    </View>
                  </View>
                  <Body small>{localized(c.summary, profile.language)}</Body>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      {!loading && !filtered.length && <Body small>{d("noResults")}</Body>}
    </Screen>
  );
}
