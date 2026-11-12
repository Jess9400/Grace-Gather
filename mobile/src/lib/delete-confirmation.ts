import type { Language } from "./content";

export function deleteConfirmationWord(language: Language) {
  return { en: "DELETE", pt: "EXCLUIR", es: "BORRAR", ru: "УДАЛИТЬ" }[language];
}
