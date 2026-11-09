import JournalConversation from "../../components/JournalConversation";
import JournalActionButton from "../../components/JournalActionButton";
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
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import type { ReadingVerse } from "../../lib/bible";
import { resolveJournalResponse } from "../../lib/journal-response";
import { journalAction, journalTheme } from "../../lib/journal-guidance";
import {
  jc,
  journalActionCopy,
  type JournalCopyKey,
} from "../../lib/journal-copy";

// One saved verse and one invitation, with replies inline beneath them.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, profile, saveEntry, saveJournalResponse } = useApp();
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
      const response = await resolveJournalResponse(e, profile);
      if (!e.response && (response.verse || e.safety)) {
        try {
          await saveJournalResponse(e.id, response);
        } catch {
          if (active) setNotice(copy(lang, "storageError"));
        }
      }
      if (active) {
        setVerse(response.verse);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
    // The original response is independent of later chat messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.response]);
  if (!entry)
    return (
      <Screen back>
        <Body>{copy(lang, "emptySub")}</Body>
      </Screen>
    );
  const action = entry.response?.actionId ?? journalAction(entry, profile);
  const actionCopy = journalActionCopy(lang, journalTheme(entry).id, action);
  const actionTitle = entry.response?.actionTitle ?? actionCopy.title;
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
                {entry.response?.invitation ?? actionCopy.invitation}
              </Text>
              <JournalActionButton
                title={actionTitle}
                onPress={() => openAction()}
              />
            </View>
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
                {!noteAction || noteAction === action
                  ? (entry.response?.actionPrompt ?? actionCopy.prompt)
                  : journalActionCopy(lang, "", noteAction).prompt}
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
