import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Field,
  Notice,
  colors,
  serif,
} from "../../components/quiet-ui";
import { TextAction } from "../../components/CommunityControls";
import AudioPlayback from "../../components/QuietAudioPlayback";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { copy, passagesFor } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import {
  collectionFor,
  ensureCollection,
  getReadingVerse,
  type ReadingVerse,
} from "../../lib/bible";
import { journalAction, journalTheme } from "../../lib/journal-guidance";
import { jc, type JournalCopyKey } from "../../lib/journal-copy";

// One submitted page, one approved verse, one invitation. No generated chat thread.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, profile, saveEntry } = useApp();
  const { update } = useQuiet();
  const entry = entries.find((e) => e.id === id);
  const [verse, setVerse] = useState<ReadingVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const lang = profile.language;
  useEffect(() => {
    let active = true;
    if (!entry) return;
    const e = entry;
    async function load() {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setVerse(null);
      const theme = journalTheme(e);
      const collection = collectionFor(e.prefs);
      let selected: ReadingVerse | null = null;
      if (collection) {
        try {
          await ensureCollection(collection);
          // Psalm numbering differs across editions; use the edition's curated match
          // until an explicit cross-edition alias exists, rather than misquote a Psalm.
          if (
            !theme.verse.startsWith("PSA.") ||
            collection === "web" ||
            collection === "blivre" ||
            collection === "rv1909"
          )
            selected = getReadingVerse(`${collection}:${theme.verse}`);
        } catch {
          /* Approved curated fallback below; no invented quotations. */
        }
      }
      const candidates = passagesFor(e.prefs, e.mood);
      const fallback =
        candidates.find((v) => e.passageIds?.includes(v.id)) ?? candidates[0];
      if (!selected && fallback) selected = getReadingVerse(fallback.id);
      if (active) {
        setVerse(selected);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [entry]);
  if (!entry)
    return (
      <Screen back>
        <Body>{copy(lang, "emptySub")}</Body>
      </Screen>
    );
  const action = journalAction(entry, profile);
  const actionTitle = jc(lang, action as JournalCopyKey);
  function edit() {
    update({
      text: entry!.text,
      createdAt: entry!.createdAt,
      chosen: entry!.feelings ?? {},
      audio: entry!.audio,
      entryId: entry!.id,
    });
    router.push("/(tabs)/diary");
  }
  function openAction() {
    const routes: Record<string, Href> = {
      A01: "/candle",
      A21: "/candle",
      A04: "/(tabs)/confession",
      A15: "/prayers?compose=1",
      A16: "/prayers",
      A18: "/giving",
      A19: "/explore",
      A20: "/testimonies/edit",
      A26: "/study",
    };
    if (routes[action]) {
      router.push(routes[action]);
      return;
    }
    setNote(entry!.reflection ?? "");
    setNotice("");
    setNoteOpen(true);
  }
  async function saveNote() {
    setBusy(true);
    setNotice("");
    try {
      await saveEntry({ ...entry!, reflection: note }, true);
      setNoteOpen(false);
      setNotice(jc(lang, "saved"));
    } catch {
      setNotice(copy(lang, "storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Screen back>
        <View style={s.top}>
          <Body small>
            {new Date(entry.createdAt).toLocaleDateString(lang, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Body>
          <TextAction
            title={q(lang, "edit")}
            icon="create-outline"
            onPress={edit}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={s.entry}
        >
          <Text style={s.dear}>{q(lang, "dear")}</Text>
          <Text
            selectable
            numberOfLines={expanded ? undefined : 3}
            style={s.writing}
          >
            {entry.text || copy(lang, "audioEntry")}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.muted}
          />
        </Pressable>
        {expanded && entry.audio && (
          <AudioPlayback id={entry.audio} language={lang} />
        )}
        {entry.safety ? (
          <Card>
            <Heading>{copy(lang, "supportTitle")}</Heading>
            <Body>{copy(lang, "supportDesc")}</Body>
            <Button
              title={jc(lang, "A07")}
              onPress={() => {
                setNote("");
                setNoteOpen(true);
              }}
            />
          </Card>
        ) : (
          <>
            <Card>
              {loading ? (
                <Body>{copy(lang, "cLoading")}</Body>
              ) : verse ? (
                <>
                  <Body small>{verse.reference}</Body>
                  <Text selectable style={s.verse}>
                    {verse.text}
                  </Text>
                  <TextAction
                    title={q(lang, "understand")}
                    icon="arrow-forward"
                    onPress={() =>
                      router.push({
                        pathname: "/verse/[id]",
                        params: { id: verse.id },
                      })
                    }
                  />
                  <Body small>{verse.editionName}</Body>
                </>
              ) : (
                <Body>{copy(lang, "unavailable")}</Body>
              )}
            </Card>
            <View style={s.action}>
              <Body small>{jc(lang, "heading")}</Body>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionTitle}
                onPress={openAction}
                style={s.actionRow}
              >
                <Text style={s.actionTitle}>{actionTitle}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.ink} />
              </Pressable>
            </View>
            {entry.aiUnavailable && <Body small>{jc(lang, "fallback")}</Body>}
          </>
        )}
        <Notice text={notice} />
      </Screen>
      <Modal
        visible={noteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteOpen(false)}
      >
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              contentContainerStyle={{ gap: 16, padding: 24 }}
            >
              <TextAction
                title={jc(lang, "close")}
                icon="close"
                onPress={() => setNoteOpen(false)}
              />
              <Heading>{entry.safety ? jc(lang, "A07") : actionTitle}</Heading>
              <Body>
                {jc(lang, action === "A05" ? "professional" : "note")}
              </Body>
              <Field
                label={jc(lang, "private")}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={3000}
              />
              <Notice text={notice} />
              <Button
                disabled={busy}
                title={jc(lang, "save")}
                onPress={() => void saveNote()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entry: { gap: 10, paddingVertical: 12 },
  dear: {
    fontFamily: serif,
    fontSize: 22,
    color: colors.ink,
    fontStyle: "italic",
  },
  writing: { fontSize: 16, lineHeight: 26, color: colors.muted },
  verse: { fontFamily: serif, fontSize: 27, lineHeight: 41, color: colors.ink },
  action: {
    paddingVertical: 18,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  actionRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionTitle: {
    fontSize: 18,
    lineHeight: 27,
    color: colors.ink,
    flex: 1,
    fontWeight: "500",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#302C2855",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
});
