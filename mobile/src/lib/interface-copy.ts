import translations from "./interface-translations.json";
import type { Language } from "./content";
import { traditionWording } from "./tradition-wording";
// Use only for authored UI strings, never Scripture, testimony, or journal text.
export function interfaceCopy(language: Language, text: string): string {
  if (language === "en") return text;
  return traditionWording(
    (translations as Record<string, Partial<Record<Language, string>>>)[text]?.[
      language
    ] ?? text,
  );
}
