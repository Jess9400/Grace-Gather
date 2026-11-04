import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  Share,
  ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Brand,
  Glass,
  Body,
  Button,
  colors,
  serif,
} from "../../components/quiet-ui";
import AudioPlayback from "../../components/QuietAudioPlayback";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { copy, data, needsSupport, passagesFor, Mood } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import { quietMood, selectQuietPassage } from "../../generated/quiet-diary";
import { aiCopy } from "../../lib/ai-copy";
interface Turn {
  text: string;
  mood: Mood;
  support: boolean;
}
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { entries, profile } = useApp(),
    { update } = useQuiet();
  const entry = entries.find((e) => e.id === id),
    lang = profile.language;
  const stream = useRef<ScrollViewInstance>(null),
    scrollRequested = useRef(false);
  const [draft, setDraft] = useState(""),
    [turns, setTurns] = useState<Turn[]>([]),
    [menu, setMenu] = useState(false),
    [action, setAction] = useState<"talk" | "kindness" | null>(null),
    [expanded, setExpanded] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(
      "Hey, I’ve had a lot on my mind. Do you have a little time to talk or keep me company?",
    ),
    [done, setDone] = useState<number[]>([]);
  if (!entry)
    return (
      <SafeAreaView style={s.safe}>
        <Button
          title={q(lang, "home")}
          onPress={() => router.replace("/(tabs)")}
        />
        <Body>{copy(lang, "emptySub")}</Body>
      </SafeAreaView>
    );
  const t = (key: string) => copy(lang, key);
  function edit() {
    if (!entry) return;
    update({
      text: entry.text,
      createdAt: entry.createdAt,
      chosen: entry.feelings ?? {},
      audio: entry.audio,
      entryId: entry.id,
      keep: !entry.sessionOnly,
    });
    router.push("/(tabs)/diary");
  }
  function send() {
    const text = draft.trim();
    if (!text) {
      setError(t("needEntry"));
      return;
    }
    scrollRequested.current = true;
    setTurns((previous) => [
      ...previous,
      { text, mood: quietMood(text, {}, lang), support: needsSupport(text) },
    ]);
    setDraft("");
    setError("");
  }
  function support() {
    return (
      <Glass style={s.response}>
        <Text accessibilityRole="header" style={s.title}>
          {t("supportTitle")}
        </Text>
        <Body>{t("supportDesc")}</Body>
        <Body>{t("supportBoundary")}</Body>
        <Button title={q(lang, "talk")} onPress={() => setAction("talk")} />
      </Glass>
    );
  }
  function response(mood: Mood, initial = false) {
    if (!entry) return null;
    const verse =
      initial && entry.guidance === "ai"
        ? passagesFor(entry.prefs, mood).find(
            (v) => !entry.passageIds || entry.passageIds.includes(v.id),
          )
        : selectQuietPassage(data.editions, entry.prefs, mood);
    return (
      <View style={s.answer}>
        {verse ? (
          <Glass style={s.response}>
            <Text style={s.reference}>{verse.reference}</Text>
            <Text selectable style={s.quote}>
              {verse.text}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${q(lang, "understand")} ${verse.reference}`}
              onPress={() =>
                router.push({
                  pathname: "/verse/[id]",
                  params: { id: verse.id },
                })
              }
              style={s.understand}
            >
              <Text style={s.control}>{q(lang, "understand")}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.ink} />
            </Pressable>
            <Text style={s.edition}>{verse.editionName}</Text>
          </Glass>
        ) : (
          <Glass style={s.response}>
            <Body>{t("unavailable")}</Body>
            <Button
              secondary
              title={t("settings")}
              onPress={() => router.push("/preferences")}
            />
          </Glass>
        )}
        <Glass style={s.care}>
          {(
            [
              ["chatbubble-outline", "talk"],
              ["heart-outline", "kindness"],
              ["leaf-outline", "giving"],
            ] as const
          ).map(([icon, key]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={q(lang, key)}
              onPress={() =>
                key === "giving" ? router.push("/giving") : setAction(key)
              }
              style={s.careButton}
            >
              <Ionicons name={icon} size={20} color={colors.goldInk} />
              <Text style={s.careText}>{q(lang, key)}</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.ink} />
            </Pressable>
          ))}
        </Glass>
      </View>
    );
  }
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Brand />
          <View style={s.topline}>
            <Pressable accessibilityRole="button" onPress={edit} style={s.back}>
              <Ionicons name="arrow-back" size={18} color={colors.muted} />
              <Text style={s.control}>{q(lang, "diary")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conversation options"
              onPress={() => setMenu(true)}
              style={s.more}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.muted}
              />
            </Pressable>
          </View>
        </View>
        <ScrollView
          ref={stream}
          onContentSizeChange={() => {
            if (scrollRequested.current) {
              scrollRequested.current = false;
              stream.current?.scrollToEnd({ animated: false });
            }
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.stream}
        >
          <Glass style={s.original}>
            <Text style={s.date}>
              {new Date(entry.createdAt).toLocaleDateString(lang, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={s.dear}>{q(lang, "dear")}</Text>
            <Text
              selectable
              numberOfLines={expanded ? undefined : 8}
              style={s.writing}
            >
              {entry.text ||
                (entry.audio
                  ? t("audioEntry")
                  : Object.keys(entry.feelings ?? {})
                      .map((key) =>
                        key === "great"
                          ? q(lang, "great")
                          : key === "sad"
                            ? q(lang, "low")
                            : t(key),
                      )
                      .join(", ") || q(lang, "moment"))}
            </Text>
            {entry.text.length > 500 && (
              <Button
                secondary
                title={expanded ? "Fold this page" : "Read the full page"}
                onPress={() => setExpanded(!expanded)}
              />
            )}
            {entry.audio && <AudioPlayback id={entry.audio} language={lang} />}
            <View style={s.originalBottom}>
              <Text style={s.date}>
                {q(lang, entry.sessionOnly ? "visit" : "saved")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={edit}
                style={{ paddingVertical: 12 }}
              >
                <Text style={s.control}>{q(lang, "edit")}</Text>
              </Pressable>
            </View>
          </Glass>
          {entry.safety ? support() : response(entry.mood, true)}
          {turns.map((turn, i) => (
            <View key={i} style={{ gap: 20, marginTop: 26 }}>
              <Glass style={s.user}>
                <Text selectable style={s.followup}>
                  {turn.text}
                </Text>
              </Glass>
              {turn.support ? support() : response(turn.mood)}
            </View>
          ))}
        </ScrollView>
        <Glass style={s.composer}>
          <View style={s.composerRow}>
            <TextInput
              accessibilityLabel={q(lang, "next")}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={3000}
              placeholder={q(lang, "next")}
              placeholderTextColor={colors.muted}
              style={s.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={send}
              style={s.send}
            >
              <Ionicons name="arrow-up" size={22} color={colors.white} />
            </Pressable>
          </View>
          {!!error && (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.ink }}
            >
              {error}
            </Text>
          )}
          <Text style={s.meta}>{q(lang, "curated")}</Text>
        </Glass>
      </KeyboardAvoidingView>
      <Modal
        visible={menu || !!action}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setMenu(false);
          setAction(null);
        }}
      >
        <View style={s.backdrop}>
          <Glass style={s.sheet}>
            <ScrollView contentContainerStyle={{ gap: 18, padding: 24 }}>
              <Button
                secondary
                title={q(lang, "close")}
                onPress={() => {
                  setMenu(false);
                  setAction(null);
                }}
              />
              {menu ? (
                <>
                  <Button
                    secondary
                    title={q(lang, "edit")}
                    onPress={() => {
                      setMenu(false);
                      edit();
                    }}
                  />
                  <Button
                    secondary
                    title={t("history")}
                    onPress={() => {
                      setMenu(false);
                      router.push("/history");
                    }}
                  />
                  <Button
                    secondary
                    title={q(lang, "tradition")}
                    onPress={() => {
                      setMenu(false);
                      router.push("/onboarding");
                    }}
                  />
                  <Body small>{q(lang, "privacy")}</Body>
                  <Body small>
                    Replies use curated passages and limited local matching.
                    They are not a live conversation with a person or AI.
                  </Body>
                  {entry.aiUnavailable && <Body>{aiCopy(lang, "failed")}</Body>}
                </>
              ) : action === "talk" ? (
                <>
                  <Text style={s.title}>{q(lang, "talk")}</Text>
                  <TextInput
                    accessibilityLabel="Your message"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={2000}
                    style={s.message}
                  />
                  <Body small>
                    Nothing is sent automatically. Edit this draft and choose
                    whether to share it.
                  </Body>
                  <Button
                    title="Share draft"
                    onPress={() =>
                      void Share.share({ message }).catch(() =>
                        setError(
                          "The share sheet could not open. You can select and copy your message.",
                        ),
                      )
                    }
                  />
                </>
              ) : (
                <>
                  <Text style={s.title}>{q(lang, "kindness")}</Text>
                  {[
                    "Send someone a sincere thank-you.",
                    "Offer help with one small, practical task.",
                    "Give yourself a quiet minute. Rest counts, too.",
                  ].map((text, i) => (
                    <Pressable
                      key={text}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done.includes(i) }}
                      onPress={() =>
                        setDone((previous) =>
                          previous.includes(i)
                            ? previous.filter((n) => n !== i)
                            : [...previous, i],
                        )
                      }
                      style={s.task}
                    >
                      <Ionicons
                        name={done.includes(i) ? "checkbox" : "square-outline"}
                        size={22}
                        color={colors.ink}
                      />
                      <Text
                        style={{
                          color: colors.ink,
                          fontSize: 17,
                          flex: 1,
                          lineHeight: 26,
                        }}
                      >
                        {text}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </Glass>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  topline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9 },
  more: {
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 30,
  },
  stream: {
    padding: 17,
    paddingBottom: 35,
    gap: 24,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  original: {
    width: "90%",
    alignSelf: "flex-end",
    padding: 22,
    gap: 14,
    borderBottomRightRadius: 5,
  },
  date: { fontSize: 11, color: colors.muted },
  dear: {
    fontFamily: serif,
    fontSize: 22,
    fontStyle: "italic",
    color: colors.ink,
  },
  writing: {
    fontFamily: serif,
    fontSize: 19,
    lineHeight: 32,
    color: colors.ink,
  },
  originalBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  control: { fontSize: 13, color: colors.ink },
  answer: { gap: 10, width: "96%" },
  response: { padding: 23, gap: 18, borderTopLeftRadius: 5 },
  reference: { fontSize: 13, color: colors.goldInk },
  quote: { fontFamily: serif, fontSize: 25, lineHeight: 40, color: colors.ink },
  understand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 46,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  edition: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  care: { marginLeft: 10, paddingHorizontal: 16, borderColor: "#B28A3E50" },
  careButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    borderBottomWidth: 1,
    borderColor: "#B28A3E25",
  },
  careText: { fontSize: 15, lineHeight: 23, color: colors.ink, flex: 1 },
  user: {
    maxWidth: "88%",
    alignSelf: "flex-end",
    padding: 20,
    borderBottomRightRadius: 5,
  },
  followup: { fontSize: 17, lineHeight: 29, color: colors.ink },
  composer: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 13,
    maxWidth: 650,
    width: "94%",
    alignSelf: "center",
    boxShadow: "0px 8px 35px rgba(48,44,40,.08)",
  },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    minHeight: 46,
    maxHeight: 125,
    color: colors.ink,
    padding: 8,
    textAlignVertical: "top",
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    fontSize: 10,
    color: colors.muted,
    paddingHorizontal: 8,
    marginTop: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#302C2855",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    maxWidth: 650,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "#FFFFFFF5",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  title: { fontFamily: serif, fontSize: 28, lineHeight: 36, color: colors.ink },
  message: {
    fontSize: 17,
    lineHeight: 27,
    padding: 15,
    minHeight: 130,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    color: colors.ink,
  },
  task: { flexDirection: "row", gap: 12, alignItems: "center", minHeight: 54 },
});
