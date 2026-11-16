import type { Language } from "./content";

// Words around the Terms of Use: its title, the onboarding tick and the link.
export const termsCopy: Record<
  Language,
  { title: string; agree: string; read: string }
> = {
  en: {
    title: "Terms of Use",
    agree: "I agree to the Terms of Use",
    read: "Read the Terms of Use",
  },
  pt: {
    title: "Termos de Uso",
    agree: "Concordo com os Termos de Uso",
    read: "Ler os Termos de Uso",
  },
  es: {
    title: "Términos de Uso",
    agree: "Acepto los Términos de Uso",
    read: "Leer los Términos de Uso",
  },
  ru: {
    title: "Условия использования",
    agree: "Я принимаю Условия использования",
    read: "Прочитать Условия использования",
  },
};
