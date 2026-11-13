import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { requireUser, backend } from "./backend";
import { useCommunity } from "./discussion-state";
export type Prayer = {
  id: string;
  theme: string;
  reason: string;
  alias: string;
  starts_at: string;
  scheduled: boolean;
  status: string;
  own: boolean;
  review_reason: string;
  count: number;
  prayed: boolean;
  reports?: string[];
};
export type PrayerNotice = {
  id: string;
  kind: string;
  is_read: boolean;
  created_at: string;
  request: Prayer;
};
export type PrayerSnapshot = {
  enabled: boolean;
  moderator: boolean;
  requests: Prayer[];
  mine: Prayer[];
  notices: PrayerNotice[];
  review: Prayer[];
};
const listeners = new Set<() => void>();
export function refreshPrayerBadges() {
  listeners.forEach((fn) => fn());
}
export function usePrayerUnread() {
  const { userId } = useCommunity();
  const [count, setCount] = useState({
    userId: "",
    prayers: 0,
    gatherings: 0,
    messages: 0,
    activity: 0,
    moderation: 0,
  });
  useEffect(() => {
    let active = true;
    if (!userId) return;
    const load = () => {
      if (AppState.currentState !== "active") return;
      if (!backend) return;
      void Promise.all([
        backend.rpc("prayer_unread"),
        backend.rpc("gathering_notifications"),
        backend.rpc("friend_unread"),
        backend.rpc("activity_snapshot"),
      ])
        .then(([prayers, gatherings, messages, activity]) => {
          if (active)
            setCount((previous) => {
              const old =
                previous.userId === userId
                  ? previous
                  : { prayers: 0, gatherings: 0, messages: 0, activity: 0, moderation: 0 };
              return {
                userId,
                prayers: prayers.error
                  ? old.prayers
                  : Number(prayers.data) || 0,
                gatherings: gatherings.error
                  ? old.gatherings
                  : Number(gatherings.data?.unread) || 0,
                messages: messages.error
                  ? old.messages
                  : Number(messages.data) || 0,
                activity: activity.error ? old.activity : Number(activity.data?.unread) || 0,
                moderation: activity.error ? old.moderation : Number(activity.data?.pendingModeration) || 0,
              };
            });
        })
        .catch(() => {});
    };
    load();
    listeners.add(load);
    const timer = setInterval(load, 30000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listeners.delete(load);
      sub.remove();
    };
  }, [userId]);
  return count.userId === userId
    ? count.prayers + count.gatherings + count.messages + count.activity + count.moderation
    : 0;
}
export function usePrayers() {
  const { userId } = useCommunity();
  const [data, setData] = useState<PrayerSnapshot | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0),
    working = useRef(false);
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    if (!userId) {
      setData(null);
      return;
    }
    try {
      const { client } = await requireUser();
      const { data, error } = await client.rpc("prayer_snapshot");
      if (error) throw error;
      if (ticket === generation.current) {
        setData(data);
        setError("");
      }
    } catch {
      if (ticket === generation.current)
        setError("Prayers could not load. Please try again.");
    }
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") void load();
      }, 30000);
      return () => {
        clearInterval(timer);
        generation.current++;
      };
    }, [load]),
  );
  async function act(
    action: string,
    id: string | null = null,
    body: Record<string, unknown> = {},
  ) {
    if (working.current) return false;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const { client } = await requireUser();
      const { data: result, error } = await client.rpc("prayer_command", {
        p_action: action,
        p_id: id,
        p_data: body,
      });
      if (error) throw error;
      if (action === "create" && result?.id) {
        // The request is already saved. A failed screen leaves it in manual review;
        // never treat a screening outage as a failed creation and invite duplicates.
        try {
          await client.functions.invoke("prayer-moderate", {
            body: { postId: result.id },
          });
        } catch {
          /* Pending review remains the safe default. */
        }
      }
      await load();
      refreshPrayerBadges();
      return true;
    } catch (e) {
      setError(
        e && typeof e === "object" && "message" in e
          ? String(e.message)
          : "Please try again.",
      );
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return { data, error, busy, userId, load, act };
}
