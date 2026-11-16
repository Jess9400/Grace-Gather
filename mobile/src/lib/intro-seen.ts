import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as storage from "./storage";

// The walk to the church is shown once on each phone, on the way into the
// church after onboarding. If the answer cannot be read, the walk is not
// shown: it must never stand between someone and the app. On the web the
// walk stays a preview at /intro and is never shown by itself.
const KEY = "intro-seen";
let pending: boolean | null = Platform.OS === "web" ? false : null;
let loading: Promise<boolean> | undefined;
function load() {
  return (loading ??= storage
    .getItem(KEY)
    .then((value) => value !== "yes")
    .catch(() => false)
    .then((answer) => (pending = pending ?? answer)));
}

// Whether the walk is still to be shown here: null until the phone has
// answered (a moment, the first time only).
export function useIntroPending() {
  const [answer, setAnswer] = useState(pending);
  useEffect(() => {
    if (answer !== null) return;
    let active = true;
    void load().then((value) => active && setAnswer(value));
    return () => {
      active = false;
    };
  }, [answer]);
  return answer;
}
export function markIntroSeen() {
  pending = false;
  void storage.setItem(KEY, "yes").catch(() => {
    // It may be offered once more on a later visit; nothing else depends on it.
  });
}
