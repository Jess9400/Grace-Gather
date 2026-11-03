import { useState } from "react";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  Screen,
  Heading,
  Body,
  Subheading,
  Card,
  Field,
  Button,
  Notice,
  External,
} from "../../components/ui";
import Recorder from "../../components/Recorder";
import { useApp } from "../../lib/state";
import { copy, dailyVerse, needsSupport, Entry } from "../../lib/content";
import { label } from "../../lib/labels";
import { persistent } from "../../lib/storage";
import { aiCopy } from "../../lib/ai-copy";
import { suggestJourney } from "../../lib/ai";
import { transcribeRecording } from "../../lib/ai-audio";
export default function Journal() {
  const { profile, saveEntry } = useApp();
  const [text, setText] = useState(""),
    [audio, setAudio] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [useAI, setUseAI] = useState(false),
    [transcribed, setTranscribed] = useState(false);
  const t = (k: string) => copy(profile.language, k),
    verse = dailyVerse(profile),
    support = needsSupport(text);
  async function submit() {
    if (!text.trim() && !audio) {
      setError(t("needEntry"));
      return;
    }
    if (useAI && !text.trim()) {
      setError(aiCopy(profile.language, "writingFirst"));
      return;
    }
    setBusy(true);
    const id = randomUUID();
    try {
      let entry: Entry = {
        id,
        createdAt: new Date().toISOString(),
        mood: "unsure",
        guidance: "general",
        text: text.trim(),
        audio,
        safety: support,
        prefs: profile,
      };
      await saveEntry(entry);
      if (useAI && !support) {
        try {
          const suggestion = await suggestJourney(text.trim(), profile);
          entry = {
            ...entry,
            mood: suggestion.path,
            guidance: "ai",
            safety: suggestion.support,
            passageIds: suggestion.passageIds,
            actionIds: suggestion.actionIds,
          };
        } catch {
          entry = { ...entry, aiUnavailable: true };
        }
        await saveEntry(entry);
      }
      setText("");
      setAudio(undefined);
      setError("");
      setUseAI(false);
      setTranscribed(false);
      router.push({ pathname: "/entry/[id]", params: { id } });
    } catch {
      setError(t("storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Body small>
        {profile.name
          ? `${t("pHello")}, ${profile.name}`
          : label(profile.language, "launch")}
      </Body>
      <Heading>{t("heart")}</Heading>
      <Card tint>
        <Body small>{t("pDaily")}</Body>
        {verse ? (
          <>
            <Subheading>“{verse.text}”</Subheading>
            <Body small>
              {verse.reference} · {verse.editionName}
            </Body>
            <External title={t("source")} url={verse.sourceUrl} />
          </>
        ) : (
          <Body>{t("unavailable")}</Body>
        )}
      </Card>
      <Body>{t("heartSub")}</Body>
      <Field
        label={t("entryLabel")}
        value={text}
        onChangeText={setText}
        placeholder={t("prompt")}
        multiline
        maxLength={30000}
      />
      <Recorder
        language={profile.language}
        value={audio}
        onChange={setAudio}
        onBusyChange={setRecording}
      />
      <Card>
        <Subheading>{aiCopy(profile.language, "title")}</Subheading>
        <Body small>{aiCopy(profile.language, "consent")}</Body>
        <Button
          secondary
          disabled={busy || recording}
          title={aiCopy(profile.language, useAI ? "off" : "agree")}
          onPress={() => setUseAI(!useAI)}
        />
        {useAI && (
          <Button
            secondary
            disabled={busy}
            title={aiCopy(profile.language, "signIn")}
            onPress={() => router.push("/account")}
          />
        )}
        {useAI && audio && (
          <Button
            disabled={busy || recording}
            title={aiCopy(profile.language, "transcribe")}
            onPress={() => {
              setBusy(true);
              setError("");
              void transcribeRecording(audio, profile.language)
                .then((transcript) => {
                  setText((previous) =>
                    [previous.trim(), transcript]
                      .filter(Boolean)
                      .join("\n\n")
                      .slice(0, 30000),
                  );
                  setTranscribed(true);
                })
                .catch(() =>
                  setError(aiCopy(profile.language, "requestFailed")),
                )
                .finally(() => setBusy(false));
            }}
          />
        )}
        {transcribed && <Body small>{aiCopy(profile.language, "review")}</Body>}
      </Card>
      {support && (
        <Card>
          <Subheading>{t("supportTitle")}</Subheading>
          <Body>{t("supportDesc")}</Body>
          <Body small>{t("supportBoundary")}</Body>
        </Card>
      )}
      <Notice text={error} />
      <Button
        disabled={busy || recording}
        title={
          busy
            ? aiCopy(profile.language, "working")
            : t(support ? "supportSave" : "continue")
        }
        onPress={() => void submit()}
      />
      <Body small>
        {persistent
          ? aiCopy(profile.language, "local")
          : label(profile.language, "webDemo")}
      </Body>
      <Button
        secondary
        title={t("history")}
        onPress={() => router.push("/history")}
      />
    </Screen>
  );
}
