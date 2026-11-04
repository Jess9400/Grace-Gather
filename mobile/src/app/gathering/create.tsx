import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Field,
  Chip,
  Row,
  Notice,
} from "../../components/community-ui";
import { useApp } from "../../lib/state";
import { languages, Language } from "../../lib/content";
import { gathering } from "../../lib/gatherings";
import { backend } from "../../lib/backend";
import { communityCopy } from "../../lib/community-copy";
export default function CreateGathering() {
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [topic, setTopic] = useState(""),
    [name, setName] = useState(profile.name),
    [language, setLanguage] = useState<Language>(profile.language),
    [now, setNow] = useState(false),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [visibility, setVisibility] = useState("public"),
    [capacity, setCapacity] = useState("20"),
    [minutes, setMinutes] = useState("60"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [configured, setConfigured] = useState(false);
  useEffect(() => {
    void backend?.functions
      .invoke("gathering-token", { method: "GET" })
      .then((r) => setConfigured(r.data?.configured === true));
  }, []);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const result = await gathering("create", {
        title,
        description,
        topic,
        name,
        language,
        now,
        localStart: date + "T" + time,
        timezone: zone,
        visibility,
        capacity: Number(capacity),
        minutes: Number(minutes),
      });
      router.replace({
        pathname: "/gathering/[id]",
        params: { id: result.id },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back keyboardAware>
      <Heading>{c("createGathering")}</Heading>
      <Body small>{c("createIntro")}</Body>
      <Notice text={error} />
      <Field
        label={c("title")}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Field
        label={c("description")}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={1000}
      />
      <Field
        label={c("topic")}
        value={topic}
        onChangeText={setTopic}
        maxLength={60}
      />
      <Field
        label={c("hostName")}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <Body small>{c("language")}</Body>
      <Row>
        {Object.entries(languages).map(([key, name]) => (
          <Chip
            key={key}
            title={name}
            selected={language === key}
            onPress={() => setLanguage(key as Language)}
          />
        ))}
      </Row>
      <Row>
        <Chip
          title={c("schedule")}
          selected={!now}
          onPress={() => setNow(false)}
        />
        <Chip
          title={c("startNow")}
          selected={now}
          onPress={() => {
            if (configured) setNow(true);
            else setError(c("audio_not_configured"));
          }}
        />
      </Row>
      {!configured && <Body small>{c("audioSetupNote")}</Body>}
      {!now && (
        <>
          <Field
            label={c("dateFormat")}
            value={date}
            onChangeText={setDate}
            placeholder="2026-11-12"
            maxLength={10}
          />
          <Field
            label={c("timeFormat")}
            value={time}
            onChangeText={setTime}
            placeholder="19:00"
            maxLength={5}
          />
        </>
      )}
      <Field
        label={c("timezone")}
        value={zone}
        onChangeText={setZone}
        autoCapitalize="none"
        placeholder="America/Sao_Paulo"
      />
      <Body small>{c("timezoneNote")}</Body>
      <Row>
        <Chip
          title={c("public")}
          selected={visibility === "public"}
          onPress={() => setVisibility("public")}
        />
        <Chip
          title={c("inviteOnly")}
          selected={visibility === "invite"}
          onPress={() => setVisibility("invite")}
        />
      </Row>
      <Body small>
        {c(
          visibility === "public"
            ? "publicGatheringNotice"
            : "inviteGatheringNotice",
        )}
      </Body>
      <Field
        label={c("capacity")}
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Field
        label={c("duration")}
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Button
        title={c("createGathering")}
        disabled={
          busy ||
          title.trim().length < 3 ||
          description.trim().length < 10 ||
          !topic.trim() ||
          !name.trim() ||
          (!now && (!date || !time)) ||
          Number(capacity) < 2 ||
          Number(capacity) > 100 ||
          Number(minutes) < 15 ||
          Number(minutes) > 180
        }
        onPress={() => void create()}
      />
    </Screen>
  );
}
