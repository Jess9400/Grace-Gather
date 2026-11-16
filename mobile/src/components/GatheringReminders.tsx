import { useEffect, useState, useCallback, useRef } from "react";
import { router } from "expo-router";
import { Body, Card, Button, Subheading, Notice } from "./quiet-ui";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { storyText } from "../lib/discover";
import { refreshPrayerBadges } from "../lib/prayers";
import type { Localized } from "../lib/content";
import { Ionicons } from "@expo/vector-icons";
type Reminder = {
  id: string;
  gathering_id: string;
  title: Localized;
  starts_at: string;
  is_read: boolean;
  host_name: string;
};
export default function GatheringReminders({
  compact = false,
  onLoadError,
  retry = 0,
}: {
  compact?: boolean;
  onLoadError?: (failed: boolean) => void;
  retry?: number;
}) {
  const { profile } = useApp();
  const c = (key: string) => communityCopy(profile.language, key);
  const [items, setItems] = useState<Reminder[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const loadVersion = useRef(0);
  useEffect(() => {
    onLoadError?.(error);
  }, [error, onLoadError]);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    const result = await backend?.rpc("gathering_notifications");
    if (version !== loadVersion.current) return;
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
      const version = ++loadVersion.current;
      try {
        const result = await backend?.rpc("gathering_notifications");
        if (!active || version !== loadVersion.current) return;
        if (!result || result.error) {
          setError(true);
          return;
        }
        setItems(result.data?.items ?? []);
        setError(false);
      } catch {
        if (active && version === loadVersion.current) setError(true);
      }
    };
    void update();
    const timer = setInterval(() => void update(), 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [retry]);
  async function read(id: string) {
    setBusy(true);
    loadVersion.current++;
    try {
      const result = await backend?.rpc("gathering_notifications", {
        p_read: id,
      });
      if (!result || result.error) {
        setError(true);
        return false;
      }
      loadVersion.current++;
      setItems(result.data?.items ?? []);
      setError(false);
      refreshPrayerBadges();
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!compact && <Subheading>{c("gatheringReminders")}</Subheading>}
      {error && !onLoadError && (
        <>
          <Notice text={c("remindersLoadError")} />
          <Button secondary title={c("retry")} onPress={() => void load()} />
        </>
      )}
      {items.filter((item) => !compact || !item.is_read).map((item) => (
        <Card key={item.id}>
          <Body small>
            <Ionicons name="calendar-outline" size={15} accessible={false} />
            {"  "}
            {c("sessionSoon")}
          </Body>
          <Body>{storyText(item.title, profile.language)}</Body>
          <Body small>
            {new Date(item.starts_at).toLocaleString(profile.language, {
              timeZoneName: "short",
            })}{" "}
            · {item.host_name}
          </Body>
          <Button
            secondary
            disabled={busy}
            title={c("viewGathering")}
            onPress={() => void (async () => {
              if (!item.is_read && !(await read(item.id))) return;
              router.push({
                pathname: "/gathering/[id]",
                params: { id: item.gathering_id },
              });
            })()}
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
      {!compact && !error && !items.length && (
        <Body small>{c("noGatheringReminders")}</Body>
      )}
    </>
  );
}
