import { useState } from "react";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  Screen,
  Heading,
  Body,
  Subheading,
  Card,
  Row,
  Chip,
  Field,
  Button,
  Notice,
  External,
} from "../../components/ui";
import Recorder from "../../components/Recorder";
import { useApp } from "../../lib/state";
import { copy, dailyVerse, moods, Mood, needsSupport } from "../../lib/content";
import { label } from "../../lib/labels";
import { persistent } from "../../lib/storage";
export default function Journal() {
  const { profile, saveEntry } = useApp();
  const [text, setText] = useState(""),
    [mood, setMood] = useState<Mood>(),
    [audio, setAudio] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false);
  const t = (k: string) => copy(profile.language, k),
    verse = dailyVerse(profile),
    support = needsSupport(text);
  async function submit() {
    if (!mood) {
      setError(t("needFeeling"));
      return;
    }
    setBusy(true);
    const id = randomUUID();
    try {
      await saveEntry({
        id,
        createdAt: new Date().toISOString(),
        mood,
        text: text.trim(),
        audio,
        safety: support,
        prefs: profile,
      });
      setText("");
      setAudio(undefined);
      setMood(undefined);
      setError("");
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
      <Row>
        {moods.map((m) => (
          <Chip
            key={m}
            title={t(m)}
            selected={mood === m}
            onPress={() => setMood(m)}
          />
        ))}
      </Row>
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
      <Body small>{label(profile.language, "noAI")}</Body>
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
        title={t(support ? "supportSave" : "continue")}
        onPress={() => void submit()}
      />
      <Body small>
        {label(profile.language, persistent ? "device" : "webDemo")}
      </Body>
      <Button
        secondary
        title={t("history")}
        onPress={() => router.push("/history")}
      />
    </Screen>
  );
}
