import JournalConversation from "../../components/JournalConversation";
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
import {
  jc,
  actionInvitation,
  type JournalCopyKey,
} from "../../lib/journal-copy";

// One verse and one invitation first; conversation is explicitly opened.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, profile, saveEntry } = useApp();
  const { update } = useQuiet();
  const entry = entries.find((e) => e.id === id);
  const [verse, setVerse] = useState<ReadingVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<string>();
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
  const hopeReflection =
    journalTheme(entry).id === "hopelessness" && action === "A08";
  const actionTitle = jc(
    lang,
    hopeReflection ? "hopeAction" : (action as JournalCopyKey),
  );
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
  function openAction(selectedAction = action) {
    setNoteAction(selectedAction);
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
    if (routes[selectedAction]) {
      router.push(routes[selectedAction]);
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
      <JournalConversation
        key={entry.id}
        entry={entry}
        initialAction={action}
        onAction={openAction}
      >
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
            <View style={s.scripture}>
              {loading ? (
                <Body>{copy(lang, "cLoading")}</Body>
              ) : verse ? (
                <>
                  <Body small>{verse.reference}</Body>
                  <Text selectable style={s.verse}>
                    {verse.text}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={q(lang, "understand")}
                    style={s.verseLink}
                    onPress={() =>
                      router.push({
                        pathname: "/verse/[id]",
                        params: { id: verse.id },
                      })
                    }
                  >
                    <Text style={s.verseLinkText}>{q(lang, "understand")}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.muted}
                    />
                  </Pressable>
                  <Text style={s.edition}>{verse.editionName}</Text>
                </>
              ) : (
                <Body>{copy(lang, "unavailable")}</Body>
              )}
            </View>
            <View style={s.action}>
              <Text style={s.invitation}>
                {hopeReflection
                  ? jc(lang, "hopeIntro")
                  : actionInvitation(lang, action)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionTitle}
                onPress={() => openAction()}
                style={s.actionRow}
              >
                <Text style={s.actionTitle}>{actionTitle}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.ink} />
              </Pressable>
            </View>
            {entry.guidance !== "ai" && (
              <Text style={s.edition}>{jc(lang, "curated")}</Text>
            )}
          </>
        )}
        <Notice text={notice} />
      </JournalConversation>
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
              <Heading>
                {entry.safety
                  ? jc(lang, "A07")
                  : noteAction && noteAction !== action
                    ? jc(lang, noteAction as JournalCopyKey)
                    : actionTitle}
              </Heading>
              <Body>
                {jc(
                  lang,
                  hopeReflection && (!noteAction || noteAction === action)
                    ? "hopeNote"
                    : (noteAction ?? action) === "A05"
                      ? "professional"
                      : "note",
                )}
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
    fontSize: 18,
    color: colors.ink,
    fontStyle: "italic",
  },
  writing: { fontSize: 16, lineHeight: 26, color: colors.muted },
  verse: { fontFamily: serif, fontSize: 26, lineHeight: 36, color: colors.ink },
  scripture: {
    gap: 12,
    paddingLeft: 20,
    paddingVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  invitation: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
  },
  verseLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  verseLinkText: { fontSize: 13, color: colors.muted },
  edition: { fontSize: 12, lineHeight: 18, color: colors.muted },
  action: {
    paddingVertical: 18,
    gap: 12,
  },
  actionRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  actionTitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    flexShrink: 1,
    fontWeight: "600",
    textDecorationLine: "underline",
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
