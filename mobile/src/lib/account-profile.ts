import { backend } from "./backend";
import { isMemberSession } from "./account";
import { initialProfile, normalizeProfile, type Profile } from "./content";

import { profileSettings } from "./profile-settings";

type ProfileRow = {
  name: string;
  city: string;
  region: string;
  country: string;
  language: string;
  tradition: string;
  scripture_language: string;
  edition: string;
  intent: string;
  notification_email: string;
  email_consent: boolean;
  updated_at: string;
  profile_state: Partial<Profile> | null;
};
export function profileFromAccount(row: ProfileRow): Profile {
  const state =
    row.profile_state && typeof row.profile_state === "object"
      ? row.profile_state
      : {};
  const language = ["en", "pt", "es", "ru"].includes(row.language)
    ? (row.language as Profile["language"])
    : "en";
  const tradition = ["catholic", "orthodox", "protestant"].includes(
    row.tradition,
  )
    ? (row.tradition as Profile["tradition"])
    : "protestant";
  return normalizeProfile({
    ...initialProfile,
    language,
    scriptureLanguage: language,
    tradition,
    name: row.name,
    city: row.city,
    region: row.region,
    country: row.country,
    edition: row.edition,
    intent: row.intent,
    email:
      typeof state.email === "string" ? state.email : row.notification_email,
    emailConsent: row.email_consent,
    faithChoice: [
      "catholic",
      "orthodox",
      "protestant",
      "exploring",
      "unspecified",
    ].includes(state.faithChoice ?? "")
      ? state.faithChoice
      : undefined,
    onboarded: state.onboarded === true,
    traditionQuestionVersion:
      typeof state.traditionQuestionVersion === "number"
        ? state.traditionQuestionVersion
        : undefined,
    termsVersion:
      typeof state.termsVersion === "number" ? state.termsVersion : undefined,
    candlePractice:
      typeof state.candlePractice === "boolean"
        ? state.candlePractice
        : undefined,
    churchLighting: ["auto", "day", "night"].includes(
      state.churchLighting ?? "",
    )
      ? state.churchLighting
      : undefined,
    weeklyCheckInAt:
      typeof state.weeklyCheckInAt === "string"
        ? state.weeklyCheckInAt
        : undefined,
  });
}
async function client(owner: string) {
  if (!backend) throw Error("profile_account_unavailable");
  const { data, error } = await backend.auth.getSession();
  if (
    error ||
    !isMemberSession(data.session) ||
    data.session?.user.id !== owner
  )
    throw Error("profile_account_changed");
  return backend;
}
export async function readAccountProfile(owner: string) {
  const db = await client(owner);
  const { data, error } = await db
    .from("profiles")
    .select(
      "name,city,region,country,language,tradition,scripture_language,edition,intent,notification_email,email_consent,updated_at,profile_state",
    )
    .eq("id", owner)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}
export async function writeAccountProfile(
  owner: string,
  profile: Profile,
  expected: string | null,
) {
  const db = await client(owner);
  const row = {
    id: owner,
    name: profile.name,
    city: profile.city,
    region: profile.region,
    country: profile.country,
    language: profile.language,
    tradition: profile.tradition,
    scripture_language: profile.scriptureLanguage,
    edition: profile.edition,
    intent: profile.intent,
    notification_email: profile.emailConsent ? profile.email : "",
    email_consent: profile.emailConsent,
    consent_at: profile.emailConsent ? new Date().toISOString() : null,
    profile_state: profileSettings(profile),
    updated_at: new Date().toISOString(),
  };
  if (!expected) {
    const { error } = await db.from("profiles").insert(row);
    if (!error) return row.updated_at;
    if (error.code !== "23505") throw error;
    // A row appeared since the last read. Fill it in only while it holds no
    // settings yet; settings saved elsewhere are never overwritten unseen.
    const current = await readAccountProfile(owner);
    if (!current || current.profile_state) throw Error("profile_changed_elsewhere");
    expected = current.updated_at;
  }
  {
    const { data, error } = await db
      .from("profiles")
      .update(row)
      .eq("id", owner)
      .eq("updated_at", expected)
      .select("updated_at");
    if (error) throw error;
    if (data.length !== 1) throw Error("profile_changed_elsewhere");
  }
  return row.updated_at;
}
