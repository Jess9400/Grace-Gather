import { useRef, useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Screen, Button, Notice, colors, letter, serif } from "./quiet-ui";
import Recorder from "./QuietRecorder";
import { useApp } from "../lib/state";
import { useQuiet } from "../lib/quiet-state";
import { copy, needsSupport, Entry } from "../lib/content";
import { resolveJournalResponse } from "../lib/journal-response";
import { q } from "../lib/quiet-copy";
import { quietMood } from "../generated/quiet-diary";
import { suggestJourney } from "../lib/ai";
import { isSignedIn } from "../lib/account";
import { transcribeRecording } from "../lib/ai-audio";
import { aiCopy, AI_CONSENT_VERSION } from "../lib/ai-copy";
export default function Diary() {
  const { profile, saveEntry, entries } = useApp(),
    { draft, update, clear } = useQuiet();
  // A new page saved once but not yet finished (for example when storage
  // failed partway) keeps its id, so trying again cannot make a duplicate.
  const saving = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false),
    // While someone is typing, the page gives the letter the whole screen
    // above the keyboard.
    [writing, setWriting] = useState(false),
    [recording, setRecording] = useState(false),
    [error, setError] = useState("");
  const useAI = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
  const lang = profile.language;
  // Editing a saved prayer, opened from its Edit button.
  const editing = entries.find((e) => e.id === draft.entryId && !e.deletedAt);
  async function submit() {
    if (
      !draft.text.trim() &&
      !draft.audio &&
      !Object.keys(draft.chosen).length
    ) {
      setError(copy(lang, "needEntry"));
      return;
    }
    setBusy(true);
    setError("");
    const mood = quietMood(draft.text, draft.chosen, lang),
      safety = needsSupport(draft.text);
    const id = draft.entryId ?? saving.current ?? randomUUID();
    const previous = entries.find((e) => e.id === id);
    // An edit that changes the words keeps the earlier wording, so nothing a
    // person wrote to God can disappear without them choosing to delete it.
    const changed = !!previous && previous.text !== draft.text;
    let entry: Entry = {
      ...previous,
      response: undefined,
      // Reclassify the edited writing. A failed request must not reuse the
      // previous entry's theme, action or fallback verse IDs.
      themeId: undefined,
      suggestedAction: undefined,
      suggestedActionExplanation: undefined,
      passageIds: undefined,
      actionIds: undefined,
      aiUnavailable: undefined,
      id,
      createdAt: draft.createdAt,
      text: draft.text,
      audio: draft.audio,
      conversation: previous?.conversation,
      reflection: previous?.reflection,
      revisions: changed
        ? [
            {
              text: previous.text,
              savedAt: previous.editedAt ?? previous.createdAt,
            },
            ...(previous.revisions ?? []),
          ].slice(0, 10)
        : previous?.revisions,
      editedAt: changed ? new Date().toISOString() : previous?.editedAt,
      mood,
      guidance: Object.keys(draft.chosen).length ? "selected" : "local",
      feelings: { ...draft.chosen },
      safety,
      prefs: {
        language: profile.language,
        scriptureLanguage: profile.scriptureLanguage,
        tradition: profile.tradition,
        edition: profile.edition,
      },
    };
    try {
      await saveEntry(entry, true);
      saving.current = entry.id;
      if (useAI && draft.text.trim() && !safety) {
        try {
          // Without an account the server cannot reply; the entry page
          // offers to add an email and then writes the reply.
          if (!(await isSignedIn())) throw Error("signed_out");
          const result = await suggestJourney(draft.text, profile);
          entry = {
            ...entry,
            mood: result.path,
            guidance: "ai",
            safety: result.support,
            passageIds: result.passageIds,
            actionIds: result.actionIds,
            themeId: result.themeId,
            suggestedAction: result.suggestedAction,
            suggestedActionExplanation: result.actionExplanation,
          };
        } catch {
          entry = { ...entry, aiUnavailable: true };
        }
        await saveEntry(entry, true);
      }
      const response = await resolveJournalResponse(entry, profile);
      if (response.verse || entry.safety)
        await saveEntry({ ...entry, response }, true);
      router.push({ pathname: "/entry/[id]", params: { id: entry.id } });
      // The saved page is finished. Whoever comes back here, by Back or by
      // "Talk to God", finds a fresh page; editing goes through Edit.
      saving.current = undefined;
      clear();
    } catch {
      setError(copy(lang, "storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      back
      place="pews"
      compact={writing}
      // "I'm done writing" never needs a scroll to find: it rests at the
      // bottom of the screen, and on the keyboard while typing.
      footer={
        <View style={s.footer}>
          <Button
            title={
              busy
                ? aiCopy(lang, "working")
                : q(lang, editing ? "saveChanges" : "done")
            }
            onPress={() => void submit()}
            disabled={busy || recording}
          />
        </View>
      }
    >
      {!writing && (
        <Text accessibilityRole="header" style={s.title}>
          {q(lang, editing ? "editingTitle" : "land")}
        </Text>
      )}
      {!writing && editing && (
        <Text style={s.editing}>
          {q(lang, "editingFrom").replace(
            "{date}",
            new Date(editing.createdAt).toLocaleString(lang, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          )}
        </Text>
      )}
      {Platform.OS !== "web" && !writing && (
        <View style={{ gap: 10 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.ink, fontSize: 16 }}
          >
            {q(lang, "audioJournal")}
          </Text>
          <Recorder
            language={lang}
            value={draft.audio}
            onChange={(audio) => update({ audio })}
            onBusyChange={setRecording}
          />
          {useAI && draft.audio && (
            <Button
              secondary
              title={aiCopy(lang, "transcribe")}
              disabled={busy || recording}
              onPress={() => {
                setBusy(true);
                void transcribeRecording(draft.audio!, lang)
                  .then((text) =>
                    update({
                      text: [draft.text, text]
                        .filter(Boolean)
                        .join("\n\n")
                        .slice(0, 30000),
                    }),
                  )
                  .catch(() => setError(aiCopy(lang, "requestFailed")))
                  .finally(() => setBusy(false));
              }}
            />
          )}
        </View>
      )}
      <View style={s.paper}>
        <View style={s.rule} />
        <Text style={s.date}>
          {new Date(draft.createdAt).toLocaleDateString(lang, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={s.dear}>{q(lang, "dear")}</Text>
        <TextInput
          accessibilityLabel={copy(lang, "entryLabel")}
          multiline
          maxLength={30000}
          value={draft.text}
          onChangeText={(text) => update({ text })}
          placeholder={copy(lang, "prompt")}
          placeholderTextColor={letter.muted}
          onFocus={() => setWriting(true)}
          onBlur={() => setWriting(false)}
          style={[s.input, writing && s.inputWriting]}
        />
      </View>
      <Notice text={error} />
      {editing && !writing && (
        <Button
          secondary
          title={q(lang, "cancelEdit")}
          disabled={busy}
          onPress={() => {
            clear();
            // Editing opened the writing tab, so Back would land on Home:
            // return to the prayer that was being edited.
            router.navigate({
              pathname: "/entry/[id]",
              params: { id: editing.id },
            });
          }}
        />
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 35, lineHeight: 43, color: colors.ink },
  editing: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  // The letter stays a cream page with dark ink in the candlelit room.
  paper: {
    backgroundColor: letter.paper,
    borderRadius: 16,
    padding: 25,
    paddingLeft: 37,
    position: "relative",
    borderWidth: 1,
    borderColor: "#C9A45C40",
    marginTop: 8,
    boxShadow: "0px 14px 34px rgba(0,0,0,.35)",
  },
  rule: {
    position: "absolute",
    left: 24,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#B28A3E40",
  },
  date: { color: letter.muted, fontSize: 12, marginBottom: 20 },
  dear: {
    fontFamily: serif,
    fontSize: 26,
    fontStyle: "italic",
    color: letter.ink,
    marginBottom: 16,
  },
  input: {
    color: letter.ink,
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 35,
    minHeight: 280,
    textAlignVertical: "top",
    padding: 0,
  },
  // While typing there is less room above the keyboard.
  inputWriting: { minHeight: 160 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
});
