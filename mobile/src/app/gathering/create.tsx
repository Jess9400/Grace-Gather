import { useEffect, useRef, useState } from "react";
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
import { audioCommand, gathering } from "../../lib/gatherings";
import { backend } from "../../lib/backend";
import { gatheringFieldsToCheck } from "../../lib/gathering-form";
import { communityCopy } from "../../lib/community-copy";
import PrayerSchedule from "../../components/PrayerSchedule";
import { Disclosure } from "../../components/CommunityControls";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { track } from "../../lib/analytics";
export default function CreateGathering() {
  const submitting = useRef(false);
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [topic, setTopic] = useState(""),
    [name, setName] = useState(profile.name),
    [language, setLanguage] = useState<Language>(profile.language),
    [weekly, setWeekly] = useState(false),
    [occurrences, setOccurrences] = useState("8"),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ),
    [visibility, setVisibility] = useState("public"),
    [everyoneSpeaks, setEveryoneSpeaks] = useState(false),
    [capacity, setCapacity] = useState("20"),
    [minutes, setMinutes] = useState("60"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [attempted, setAttempted] = useState(false),
    [now, setNow] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(backend ? null : false);
  useEffect(() => {
    if (!backend) return;
    void backend.functions.invoke("gathering-token", { method: "GET" }).then(
      (r) => setConfigured(r.data?.configured === true),
      () => setConfigured(false),
    );
  }, []);
  const checkingLive = now && configured === null;
  const missingFields = gatheringFieldsToCheck({
    title,
    description,
    topic,
    name,
    date,
    time,
    zone,
    capacity,
    minutes,
    occurrences,
    now,
    weekly,
  });
  const audioIssue =
    now && !configured
      ? c(checkingLive ? "checkingGatheringAudio" : "audioSetupNote")
      : "";
  const validation =
    attempted && missingFields.length
      ? c("checkGatheringFields").replace(
          "{fields}",
          missingFields.map(c).join(", "),
        )
      : "";
  async function create() {
    if (submitting.current) return;
    setError("");
    setAttempted(true);
    if (audioIssue || missingFields.length) return;
    submitting.current = true;
    setBusy(true);
    try {
      const result = await gathering("create", {
        title,
        description,
        topic,
        name,
        language,
        now,
        localStart: date + "T" + time,
        timezone: zone.trim(),
        visibility,
        capacity: Number(capacity),
        minutes: Number(minutes),
        repeat: !now && weekly ? "weekly" : "none",
        occurrences: !now && weekly ? Number(occurrences) : 1,
      });
      track("gathering_created", { weekly: !now && weekly, startNow: now, everyoneSpeaks, visibility });
      // New gatherings let only invited people speak; open the floor if chosen.
      if (everyoneSpeaks && configured)
        await audioCommand("speak_mode", {
          gatheringId: result.id,
          enabled: true,
        }).catch(() => {});
      router.replace({
        pathname: "/gathering/[id]",
        params: { id: result.id },
      });
    } catch (e) {
      setError(c(serverProblem((e as Error).message)));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen back keyboardAware>
      <Heading>{c("createGathering")}</Heading>
      <Body small>{c("createIntro")}</Body>
      <Field
        label={c("gatheringTitleLabel")}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Body small>{c("titleHint")}</Body>
      <Field
        label={c("gatheringDescriptionLabel")}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={1000}
      />
      {/* The ten-character minimum is visible while typing, not discovered later. */}
      <Body small>
        {c("descriptionHint")}
        {description.trim().length < 10
          ? " " + c("descriptionCount").replace("{n}", String(description.trim().length))
          : ""}
      </Body>
      <Field
        label={c("topic")}
        value={topic}
        onChangeText={setTopic}
        maxLength={60}
      />
      <Body small>{c("topicHint")}</Body>
      <Row>
        {["topicPrayer", "topicBible", "topicWorship", "topicSupport", "topicTestimony"].map((key) => (
          <Chip
            key={key}
            title={c(key)}
            selected={topic === c(key)}
            onPress={() => setTopic(c(key))}
          />
        ))}
      </Row>
      <Field
        label={c("hostName")}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <Body small>{c("hostNameHint")}</Body>
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
          onPress={() => setNow(true)}
        />
      </Row>
      {checkingLive && <Body small>{c("checkingGatheringAudio")}</Body>}
      {configured === false && <Body small>{c("audioSetupNote")}</Body>}
      {!now && (
        <>
          <Body small>{c("repeat")}</Body>
          <Row>
            <Chip
              title={c("doesNotRepeat")}
              selected={!weekly}
              onPress={() => setWeekly(false)}
            />
            <Chip
              title={c("weekly")}
              selected={weekly}
              onPress={() => setWeekly(true)}
            />
          </Row>
          {weekly && (
            <>
              <Field
                label={c("sessionCount")}
                value={occurrences}
                onChangeText={setOccurrences}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Body small>{c("weeklyNote")}</Body>
            </>
          )}
          <PrayerSchedule
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
            dateLabel={c("dateLabel")}
            timeLabel={c("timeLabel")}
          />
        </>
      )}
      {/* The phone's own time zone is almost always right; changing it is tucked away. */}
      <Disclosure title={c("timezone") + ": " + zone}>
        <Field
          label={c("timezone")}
          value={zone}
          onChangeText={setZone}
          autoCapitalize="none"
          placeholder="America/Sao_Paulo"
        />
        <Body small>{c("timezoneNote")}</Body>
      </Disclosure>
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
      <Body>{c("whoCanSpeak")}</Body>
      <Row>
        <Chip
          title={c("speakInvited")}
          selected={!everyoneSpeaks}
          onPress={() => setEveryoneSpeaks(false)}
        />
        <Chip
          title={c("speakEveryone")}
          selected={everyoneSpeaks}
          onPress={() => setEveryoneSpeaks(true)}
        />
      </Row>
      <Body small>
        {c(everyoneSpeaks ? "speakEveryoneNote" : "speakInvitedNote")}
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
      <Body small>{c("gatheringReminderNote")}</Body>
      <Notice text={error || (attempted && audioIssue) || validation} />
      <Button
        title={busy ? tr("Saving…") : c("createGathering")}
        loading={busy}
        disabled={busy}
        onPress={() => void create()}
      />
    </Screen>
  );
}

// The server explains problems in English; show them in the reader's language.
function serverProblem(message: string) {
  if (message === "hosts_only") return "hosts_only";
  if (/timezone/i.test(message)) return "badTimezone";
  if (/future date|clocks change|requested format/i.test(message)) return "needFutureTime";
  if (/Daily gathering limit/i.test(message)) return "dailyLimit";
  if (/title|description/i.test(message)) return "needDescription";
  if (/duration/i.test(message)) return "needDuration";
  if (/weekly/i.test(message)) return "needSessions";
  if (/topic|capacity|language|visibility/i.test(message)) return "needTopic";
  return "createFailed";
}
