import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { backend } from "./backend";

// How many people have the app open right now. Each device joins one shared
// Supabase Realtime presence channel under a random key that changes every
// time; no account, name or journal data is sent. Returns null when the
// count is unavailable (offline, not configured, or presence not allowed).
export function useChurchPresence() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const client = backend;
    if (!client) return;
    let channel: ReturnType<typeof client.channel> | null = null;
    const join = () => {
      if (channel) return;
      const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const joined = client.channel("church-presence", {
        config: { presence: { key } },
      });
      joined.on("presence", { event: "sync" }, () =>
        setCount(Object.keys(joined.presenceState()).length),
      );
      joined.subscribe((status) => {
        if (status === "SUBSCRIBED") void joined.track({ here: true });
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setCount(null);
      });
      channel = joined;
    };
    const leave = () => {
      if (channel) void client.removeChannel(channel);
      channel = null;
      setCount(null);
    };
    if (AppState.currentState === "active") join();
    const sub = AppState.addEventListener("change", (state) =>
      state === "active" ? join() : leave(),
    );
    return () => {
      sub.remove();
      leave();
    };
  }, []);
  return count;
}
