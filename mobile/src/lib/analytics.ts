import { Platform } from "react-native";
import PostHog from "posthog-react-native";

// Product analytics with PostHog, privacy first:
// - only the named events below, with small fixed details (never text a
//   person wrote, names, emails or message content);
// - no automatic tap capture, no heatmaps, no session recording;
// - the person is known only by their anonymous account ID;
// - anyone can switch it off in Profile, and it is off in development.
// The project key is public by design (it can only send events), so it is
// kept here as the default; a build setting can replace it.
const KEY =
  process.env.EXPO_PUBLIC_POSTHOG_KEY ||
  "phc_ALp8kk5tqePqsJM4rdadxR2fMRS9A2ZprRe77vQuqnrA";
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export type AnalyticsEvent =
  | "onboarding_completed"
  | "intro_finished"
  | "church_entered"
  | "journal_entry_saved"
  | "candle_lit"
  | "prayer_request_created"
  | "prayed_for_someone"
  | "gathering_created"
  | "gathering_joined"
  | "friend_link_shared"
  | "friend_added"
  | "friend_request_sent"
  | "home_notice_opened";
// Only short, fixed values: a kind, a language, a yes/no, a count.
type Detail = string | number | boolean;

// The browser has no file storage for PostHog; use the page's own storage,
// and carry on in memory when the browser keeps none (private mode).
const webStorage = {
  getItem: (key: string) => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* Not kept in this browser. */
    }
  },
};

let client: PostHog | null | undefined;
function posthog() {
  if (client !== undefined) return client;
  if (!KEY || (typeof __DEV__ !== "undefined" && __DEV__)) return (client = null);
  try {
    client = new PostHog(KEY, {
      host: HOST,
      enableSessionReplay: false,
      personProfiles: "identified_only",
      preloadFeatureFlags: false,
      ...(Platform.OS === "web" ? { customStorage: webStorage } : {}),
    });
  } catch {
    client = null;
  }
  return client;
}

/** Records one named event. Never pass anything a person wrote. */
export function track(event: AnalyticsEvent, details?: Record<string, Detail>) {
  try {
    posthog()?.capture(event, details);
  } catch {
    /* Analytics never gets in the way. */
  }
}

/** Links events to the signed-in account's anonymous ID, or forgets it. */
export function identifyAccount(accountId: string | null) {
  try {
    const ph = posthog();
    if (!ph) return;
    if (accountId) ph.identify(accountId);
    else ph.reset();
  } catch {
    /* Analytics never gets in the way. */
  }
}

/** Starts analytics early, so app opens are counted. */
export function startAnalytics() {
  posthog();
}
export function analyticsAvailable() {
  return !!posthog();
}
export function usageDataShared() {
  return !posthog()?.optedOut;
}
export async function shareUsageData(on: boolean) {
  const ph = posthog();
  if (!ph) return;
  if (on) await ph.optIn();
  else await ph.optOut();
}
