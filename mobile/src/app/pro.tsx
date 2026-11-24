import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  colors,
  serif,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import copy from "../lib/pro-study-preview.json";

const languages = ["en", "pt", "es", "ru"] as const;
const traditionIds = ["catholic", "protestant", "orthodox", "exploring"];
const references = [
  "Romans 15:13",
  "Matthew 11:28",
  "Psalm 107:1",
  "James 1:5",
  "James 1:19",
  "Zechariah 4:10",
  "Philippians 4:6–7",
];
const planReadings = [
  Array.from({ length: 16 }, (_, i) => `Mark ${i + 1}`),
  [
    "Psalm 23",
    "Psalm 46",
    "Psalm 62",
    "Psalm 91",
    "Psalm 121",
    "Psalm 130",
    "Psalm 139",
  ],
  ["Matthew 5", "Matthew 6", "Matthew 7"],
  ["James 1", "James 2", "James 3", "James 4", "James 5"],
  ["Ruth 1", "Ruth 2", "Ruth 3", "Ruth 4"],
  [
    "1 Corinthians 13",
    "John 13:1–17",
    "Luke 10:25–37",
    "Romans 12",
    "1 John 4:7–21",
  ],
];
const icons = [
  "book-outline",
  "musical-notes-outline",
  "sunny-outline",
  "footsteps-outline",
  "leaf-outline",
  "heart-outline",
] as const;
export default function Pro() {
  const { profile } = useApp();
  const [language, setLanguage] = useState<(typeof languages)[number]>(
    profile.language,
  );
  const [tradition, setTradition] = useState(
    Math.max(0, traditionIds.indexOf(profile.tradition)),
  );
  const [tab, setTab] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [days, setDays] = useState<Record<number, number>>({});
  const [detail, setDetail] = useState<number | null>(null);
  const [devotional, setDevotional] = useState(false);
  const [tool, setTool] = useState<number | null>(null);
  const [word, setWord] = useState(0);
  const [pricing, setPricing] = useState(false);
  const [annual, setAnnual] = useState(false);
  const c = copy[language];
  const ref = (value: string) =>
    value.replace(
      /^(1 Corinthians|1 John|[A-Za-z]+)/,
      (book) => c.books[book as keyof typeof c.books] ?? book,
    );
  const date = new Date();
  const dailyIndex =
    Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
    ) % 7;
  const daily = c.devotionals[dailyIndex];
  const close = () => {
    setDetail(null);
    setDevotional(false);
    setTool(null);
    setPricing(false);
  };
  return (
    <Screen home>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={s.row}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
        <Body>{c.study}</Body>
      </Pressable>
      <View style={s.row}>
        <Text style={s.gold}>✧ PRO</Text>
        <Body small>{c.preview}</Body>
      </View>
      <Heading>{c.heading}</Heading>
      <Body>{c.intro}</Body>
      <View style={s.row}>
        {languages.map((l) => (
          <Pressable
            key={l}
            accessibilityRole="button"
            accessibilityState={{ selected: language === l }}
            onPress={() => setLanguage(l)}
            style={[s.chip, language === l && s.selected]}
          >
            <Text style={s.text}>{l.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {c.traditionNames.map((name, i) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={{ selected: tradition === i }}
            onPress={() => setTradition(i)}
            style={[s.chip, tradition === i && s.selected]}
          >
            <Text style={s.text}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.tabs}>
        {[c.today, c.plans, c.words].map((name, i) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === i }}
            onPress={() => setTab(i)}
            style={[s.tab, tab === i && s.tabActive]}
          >
            <Text style={[s.text, tab === i && s.gold]}>{name}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 0 && (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDevotional(true)}
          >
            <Card>
              <View style={s.row}>
                <Ionicons
                  name="sunny-outline"
                  size={30}
                  color={colors.goldInk}
                />
                <Text style={s.gold}>{c.daily}</Text>
              </View>
              <Heading>{daily[0]}</Heading>
              <Body small>{ref(references[dailyIndex])}</Body>
              <Body>{daily[1]}</Body>
              <Text style={s.gold}>{c.open} →</Text>
            </Card>
          </Pressable>
          {active !== null && (
            <Card>
              <Body small>{c.selected}</Body>
              <Text style={s.title}>{c.planTitles[active]}</Text>
              <Body>
                {c.day} {(days[active] ?? 0) + 1} /{" "}
                {planReadings[active].length}
              </Body>
              <Button title={c.continue} onPress={() => setDetail(active)} />
            </Card>
          )}
          <Text style={s.title}>{c.library}</Text>
        </>
      )}
      {tab !== 2 && (
        <View style={s.grid}>
          {c.planTitles.map((name, i) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => setDetail(i)}
              style={s.plan}
            >
              <View style={s.art}>
                <Ionicons name={icons[i]} size={38} color={colors.goldInk} />
              </View>
              <Text style={s.title}>{name}</Text>
              <Body small>
                {planReadings[i].length} · {c.days} · 5–10 min
              </Body>
              <Text style={s.gold}>↗</Text>
            </Pressable>
          ))}
        </View>
      )}
      {tab === 2 && (
        <>
          {[c.original, c.context, c.compare, c.sources, c.reason].map(
            (name, i) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                onPress={() => setTool(i)}
                style={s.tool}
              >
                <Ionicons
                  name={
                    (
                      [
                        "language-outline",
                        "time-outline",
                        "git-compare-outline",
                        "library-outline",
                        "chatbubble-outline",
                      ] as const
                    )[i]
                  }
                  size={25}
                  color={colors.goldInk}
                />
                <Text style={[s.title, s.grow]}>{name}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            ),
          )}
          <Body small>{c.traditionNotes[tradition]}</Body>
        </>
      )}
      <Body small>
        {c.sample} · {c.notice}
      </Body>
      <Button title={c.pricing} secondary onPress={() => setPricing(true)} />
      <Modal
        visible={detail !== null || devotional || tool !== null || pricing}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={s.shade}>
          <View style={s.sheet}>
            <ScrollView contentContainerStyle={s.sheetContent}>
              {devotional && (
                <>
                  <Text style={s.gold}>{c.daily}</Text>
                  <Heading>{daily[0]}</Heading>
                  <Body>{ref(references[dailyIndex])}</Body>
                  <Text style={s.title}>{c.reflect}</Text>
                  <Body>{daily[1]}</Body>
                  <Text style={s.title}>{c.pray}</Text>
                  <Body>{daily[2]}</Body>
                  <Body small>{c.traditionNotes[tradition]}</Body>
                </>
              )}
              {detail !== null && (
                <>
                  <Heading>{c.planTitles[detail]}</Heading>
                  <Body small>
                    {c.sample} · {planReadings[detail].length} {c.days}
                  </Body>
                  <Text style={s.reading}>
                    {ref(
                      planReadings[detail][
                        Math.min(
                          days[detail] ?? 0,
                          planReadings[detail].length - 1,
                        )
                      ],
                    )}
                  </Text>
                  <Body>{c.question}</Body>
                  <Body small>{c.traditionNotes[tradition]}</Body>
                  <Button
                    title={active === detail ? c.complete : c.start}
                    disabled={
                      (days[detail] ?? 0) >= planReadings[detail].length
                    }
                    onPress={() => {
                      setActive(detail);
                      if (active === detail)
                        setDays({ ...days, [detail]: (days[detail] ?? 0) + 1 });
                    }}
                  />
                </>
              )}
              {tool !== null && (
                <>
                  <Heading>
                    {
                      [c.original, c.context, c.compare, c.sources, c.reason][
                        tool
                      ]
                    }
                  </Heading>
                  {tool === 0 ? (
                    <>
                      {c.lexicon.map((entry, i) => (
                        <Button
                          key={entry[0]}
                          title={entry[0]}
                          secondary={word !== i}
                          onPress={() => setWord(i)}
                        />
                      ))}
                      <Text style={s.reading}>{c.lexicon[word][0]}</Text>
                      <Body small>{c.lexicon[word][1]}</Body>
                      <Body>{c.lexicon[word][2]}</Body>
                    </>
                  ) : tool === 1 ? (
                    <>
                      <Text style={s.reading}>{ref("Mark 1")}</Text>
                      <Body>{c.contextSample}</Body>
                    </>
                  ) : tool === 2 ? (
                    <>
                      {c.traditionNames.map((name, i) => (
                        <View key={name}>
                          <Text style={s.title}>{name}</Text>
                          <Body>{c.traditionNotes[i]}</Body>
                        </View>
                      ))}
                    </>
                  ) : tool === 3 ? (
                    <>
                      <Body>STEPBible · CC BY 4.0</Body>
                      <Body>
                        NET Bible · Crossway · Ignatius · Orthodox Study Bible
                      </Body>
                      <Body>{c.notice}</Body>
                    </>
                  ) : (
                    <>
                      <Text style={s.reading}>{ref("Mark 1")}</Text>
                      <Body>{c.question}</Body>
                      <Body>{c.contextSample}</Body>
                      <Body>{c.notice}</Body>
                    </>
                  )}
                  <Text style={s.gold}>{c.sample}</Text>
                </>
              )}
              {pricing && (
                <>
                  <Heading>{c.pricing}</Heading>
                  {[false, true].map((value) => (
                    <Button
                      key={String(value)}
                      secondary={annual !== value}
                      title={value ? c.annual : c.monthly}
                      onPress={() => setAnnual(value)}
                    />
                  ))}
                  <Text style={s.title}>{c.trial}</Text>
                  <Body small>
                    {c.preview} · {c.notice}
                  </Body>
                </>
              )}
              <Button title={c.close} secondary onPress={close} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  text: { color: colors.ink, fontSize: 14 },
  gold: { color: colors.goldInk, fontSize: 13, letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "600" },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selected: { backgroundColor: colors.pale, borderColor: colors.goldInk },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabActive: { borderColor: colors.goldInk },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  plan: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  art: {
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
    borderRadius: 12,
  },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  grow: { flex: 1 },
  shade: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0009",
  },
  sheet: { maxHeight: "85%", borderRadius: 24, backgroundColor: colors.paper },
  sheetContent: { padding: 24, gap: 20 },
  reading: { fontFamily: serif, fontSize: 28, color: colors.ink },
});
