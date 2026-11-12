import type { Language } from "./content";

// Chooses the right word for a count. English, Portuguese and Spanish have
// two forms; Russian has three (1 ответ, 2 ответа, 5 ответов).
export function pluralForm(language: Language, n: number, forms: string[]) {
  const abs = Math.abs(n);
  if (language === "ru") {
    const ten = abs % 10,
      hundred = abs % 100;
    if (ten === 1 && hundred !== 11) return forms[0];
    if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return forms[1];
    return forms[2] ?? forms[1];
  }
  return abs === 1 ? forms[0] : forms[1];
}

const replyForms: Record<Language, string[]> = {
  en: ["reply", "replies"],
  pt: ["resposta", "respostas"],
  es: ["respuesta", "respuestas"],
  ru: ["ответ", "ответа", "ответов"],
};

export const replyCount = (language: Language, n: number) =>
  `${n} ${pluralForm(language, n, replyForms[language] ?? replyForms.en)}`;
