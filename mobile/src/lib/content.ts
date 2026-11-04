import catalog from "../generated/catalog.json";
export type Language = "en" | "pt" | "es" | "ru";
export type Tradition = "protestant" | "catholic" | "orthodox";
export type Mood =
  | "grateful"
  | "peaceful"
  | "hopeful"
  | "anxious"
  | "lonely"
  | "sad"
  | "overwhelmed"
  | "hopeless"
  | "unsure";
export type Localized = Record<Language, string>;
export interface Preferences {
  language: Language;
  scriptureLanguage: Language;
  tradition: Tradition;
  edition: string;
}
export interface Profile extends Preferences {
  faithChoice?: Tradition | "exploring" | "unspecified";
  traditionQuestionVersion?: number;
  name: string;
  city: string;
  region: string;
  country: string;
  intent: string;
  email: string;
  emailConsent: boolean;
  onboarded: boolean;
}
export interface Entry {
  id: string;
  createdAt: string;
  mood: Mood;
  guidance?: "general" | "selected" | "ai" | "local";
  sessionOnly?: boolean;
  feelings?: Record<string, number>;
  aiUnavailable?: boolean;
  passageIds?: string[];
  actionIds?: string[];
  text: string;
  audio?: string;
  action?: string;
  reflection?: string;
  safety: boolean;
  prefs: Preferences;
}
export interface Resource {
  id: string;
  type?: string;
  category?: string;
  title: Localized;
  summary: Localized;
  body?: Localized;
  tags?: string[];
  tradition?: string;
  resources?: string[][];
  source?: string;
  provider?: string;
  format?: string;
  lang?: string;
  url?: string;
  lessons?: string[];
}
export const data = catalog;
export const languages: Record<Language, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
  ru: "Русский",
};
export const moods: Mood[] = [
  "grateful",
  "peaceful",
  "hopeful",
  "anxious",
  "lonely",
  "sad",
  "overwhelmed",
  "hopeless",
  "unsure",
];
export const initialProfile: Profile = {
  language: "en",
  scriptureLanguage: "en",
  tradition: "protestant",
  edition: "web",
  name: "",
  city: "",
  region: "",
  country: "BR",
  intent: "faith",
  email: "",
  emailConsent: false,
  onboarded: false,
};
export function copy(language: Language, key: string): string {
  if (key === "explore")
    return { en: "Discover", pt: "Descobrir", es: "Descubrir", ru: "Обзор" }[
      language
    ];
  for (const source of [
    catalog.CONFESSION_COPY,
    catalog.PROFILE_COPY,
    catalog.COMMUNITY_COPY,
    catalog.FLOW_COPY,
    catalog.COPY,
  ]) {
    const result = (source[language] as Record<string, string>)[key];
    if (result) return result;
  }
  return key;
}
export const localized = (value: Localized | undefined, lang: Language) =>
  value?.[lang] ?? value?.en ?? "";
export function editionsFor(p: Preferences) {
  return data.editions.filter(
    (e) =>
      e.language === p.scriptureLanguage &&
      (e.traditions as string[]).includes(p.tradition),
  );
}
export function normalizeProfile(p: Profile): Profile {
  const options = editionsFor(p);
  return {
    ...p,
    edition: options.some((e) => e.id === p.edition)
      ? p.edition
      : (options[0]?.id ?? ""),
  };
}
export function passagesFor(p: Preferences, mood: Mood) {
  const edition = editionsFor(p).find((e) => e.id === p.edition);
  if (!edition) return [];
  const theme = data.PATHS[mood].theme;
  return edition.passages
    .filter((v) => v.theme === theme)
    .sort(
      (a, b) =>
        Number("situations" in b && (b.situations as string[]).includes(mood)) -
        Number("situations" in a && (a.situations as string[]).includes(mood)),
    )
    .slice(0, 2)
    .map((v) => ({
      ...v,
      editionName: edition.name,
      attribution: edition.attribution,
      licenseUrl: edition.licenseUrl,
    }));
}
export function dailyVerse(p: Preferences) {
  const edition = editionsFor(p).find((e) => e.id === p.edition);
  if (!edition) return null;
  const day = new Date();
  const n = Math.floor(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86400000,
  );
  return {
    ...edition.passages[n % edition.passages.length],
    editionName: edition.name,
  };
}
export function needsSupport(text: string) {
  return /\b(kill myself|end my life|hurt myself|suicid(?:e|al)|matarme|quitarme la vida|suicidarme|me matar|tirar minha vida|me machucar|suicídio|suicidio)\b|(?:покончить с собой|убить себя|хочу умереть|самоубийств)/iu.test(
    text,
  );
}
const normalizeCity = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export function localOrganizations(p: Profile) {
  return data.ORGANIZATIONS.filter(
    (o) =>
      p.country === "BR" &&
      o.locations.some(
        (x) =>
          normalizeCity(x.city) === normalizeCity(p.city) &&
          x.region === p.region.toUpperCase(),
      ),
  );
}
