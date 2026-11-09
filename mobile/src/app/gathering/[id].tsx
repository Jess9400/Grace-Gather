import { useClock } from "../../lib/use-clock";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Notice,
  Busy,
} from "../../components/community-ui";
import RoomControls from "../../components/RoomControls";
import { useAudioRoom } from "../../lib/audio-room";
import { gathering, Gathering } from "../../lib/gatherings";
import { storyText } from "../../lib/discover";
import { useApp } from "../../lib/state";
import { communityCopy } from "../../lib/community-copy";
export default function GatheringPage() {
  const now = useClock();
  const { id, invite } = useLocalSearchParams<{
      id: string;
      invite?: string;
    }>(),
    { profile } = useApp(),
    audio = useAudioRoom(),
    c = (k: string) => communityCopy(profile.language, k);
  const [pendingCancel, setPendingCancel] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  async function act(action: string) {
    setActionBusy(true);
    try {
      await gathering(action, { id, invite });
      setItem(await gathering("details", { id, invite }));
      setPendingCancel("");
      setError("");
    } catch {
      setError("actionError");
    } finally {
      setActionBusy(false);
    }
  }
  const [item, setItem] = useState<Gathering | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void gathering("details", { id, invite })
      .then((data) => {
        if (active) setItem(data);
      })
      .catch(() => {
        if (active) setError("gatheringUnavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, invite]);
  return (
    <Screen back>
      <Heading>
        {item ? storyText(item.title, profile.language) : c("gatherings")}
      </Heading>
      <Notice text={c(error)} />
      {loading && <Busy />}
      {item && (
        <>
          <Body>{storyText(item.description, profile.language)}</Body>
          <Body small>
            {item.host_name} · {item.topic} · {item.language.toUpperCase()}
          </Body>
          {item.series_id && <Body small>{c("weekly")}</Body>}
          {item.status === "published" &&
            Date.parse(item.starts_at) > now &&
            !item.hosting && (
              <>
                <Button
                  secondary
                  disabled={actionBusy}
                  title={c(item.reserved ? "cancelReservation" : "reserve")}
                  onPress={() => void act(item.reserved ? "leave" : "reserve")}
                />
                <Body small>{c("gatheringReminderNote")}</Body>
              </>
            )}
          {item.hosting &&
            item.status === "published" &&
            Date.parse(item.starts_at) > now && (
              <>
                {!pendingCancel ? (
                  <>
                    <Button
                      secondary
                      title={c("cancelSession")}
                      onPress={() => setPendingCancel("cancel")}
                    />
                    {item.series_id && (
                      <Button
                        secondary
                        title={c("cancelSeries")}
                        onPress={() => setPendingCancel("cancel_series")}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Body>
                      {c(
                        pendingCancel === "cancel_series"
                          ? "cancelSeries"
                          : "cancelSession",
                      )}
                    </Body>
                    <Button
                      secondary
                      disabled={actionBusy}
                      title={c("confirmCancel")}
                      onPress={() => void act(pendingCancel)}
                    />
                    <Button
                      secondary
                      disabled={actionBusy}
                      title={c("keepSession")}
                      onPress={() => setPendingCancel("")}
                    />
                  </>
                )}
              </>
            )}
          {item.status === "cancelled" ? (
            <Body>{c("cancelled")}</Body>
          ) : audio.session?.id === id ? (
            <RoomControls />
          ) : (
            <>
              <Body small>
                {new Date(item.starts_at).toLocaleString(profile.language, {
                  timeZone: item.timezone,
                })}{" "}
                · {item.timezone}
              </Body>
              <Notice text={c(audio.notice)} />
              <Body>{c("joinNotice")}</Body>
              {audio.session && <Body small>{c("switchRoom")}</Body>}
              {item.status === "ended" || Date.parse(item.ends_at) <= now ? (
                <Body>{c("ended")}</Body>
              ) : (
                <Button
                  title={c(
                    audio.busy
                      ? "connecting"
                      : Date.parse(item.starts_at) > now
                        ? "not_started"
                        : "joinMuted",
                  )}
                  disabled={audio.busy || Date.parse(item.starts_at) > now}
                  onPress={() => void audio.join(id, invite)}
                />
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
