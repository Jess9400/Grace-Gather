import { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { Body, Card, Button, Subheading, Notice } from "./quiet-ui";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { storyText } from "../lib/discover";
import { refreshPrayerBadges } from "../lib/prayers";
import type { Localized } from "../lib/content";
type Reminder = {
  id: string;
  gathering_id: string;
  title: Localized;
  starts_at: string;
  is_read: boolean;
  host_name: string;
};
export default function GatheringReminders() {
  const { profile } = useApp();
  const c = (key: string) => communityCopy(profile.language, key);
  const [items, setItems] = useState<Reminder[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await backend?.rpc("gathering_notifications");
    if (!result || result.error) {
      setError(true);
      return;
    }
    setItems(result.data?.items ?? []);
    setError(false);
  }, []);
  useEffect(() => {
    let active = true;
    const update = async () => {
      const result = await backend?.rpc("gathering_notifications");
      if (!active) return;
      if (!result || result.error) {
        setError(true);
        return;
      }
      setItems(result.data?.items ?? []);
      setError(false);
    };
    void update();
    const timer = setInterval(() => void update(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function read(id: string) {
    setBusy(true);
    try {
      const result = await backend?.rpc("gathering_notifications", {
        p_read: id,
      });
      if (!result || result.error) {
        setError(true);
        return;
      }
      setItems(result.data?.items ?? []);
      setError(false);
      refreshPrayerBadges();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Subheading>{c("gatheringReminders")}</Subheading>
      {error && (
        <>
          <Notice text={c("remindersLoadError")} />
          <Button secondary title={c("retry")} onPress={() => void load()} />
        </>
      )}
      {items.map((item) => (
        <Card key={item.id}>
          <Body small>{c("sessionSoon")}</Body>
          <Body>{storyText(item.title, profile.language)}</Body>
          <Body small>
            {new Date(item.starts_at).toLocaleString(profile.language, {
              timeZoneName: "short",
            })}{" "}
            · {item.host_name}
          </Body>
          <Button
            secondary
            title={c("viewGathering")}
            onPress={() =>
              router.push({
                pathname: "/gathering/[id]",
                params: { id: item.gathering_id },
              })
            }
          />
          {!item.is_read && (
            <Button
              secondary
              disabled={busy}
              title={c("markRead")}
              onPress={() => void read(item.id)}
            />
          )}
        </Card>
      ))}
      {!error && !items.length && (
        <Body small>{c("noGatheringReminders")}</Body>
      )}
    </>
  );
}
