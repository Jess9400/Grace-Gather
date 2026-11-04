import metadata from "../generated/reading-resources.json";
import { data, Profile, Tradition, Localized } from "./content";
export interface ReadingBook {
  id: string;
  title: string;
  author: string;
  language: string;
  moods: string[];
  url: string;
  note: Localized;
}
export interface BookPerspective {
  kind: "faith" | "general" | "unclassified";
  traditions: string[];
  perspective: Localized;
  sourceUrl: string;
}
const unclassified: BookPerspective = {
  kind: "unclassified",
  traditions: [],
  perspective: {
    en: "Perspective not yet reviewed",
    pt: "Perspectiva ainda não revisada",
    es: "Perspectiva aún no revisada",
    ru: "Направление пока не проверено",
  },
  sourceUrl: "",
};
export function bookPerspective(id: string): BookPerspective {
  return (
    (metadata.metadata as Record<string, BookPerspective>)[id] ?? unclassified
  );
}
export function chosenReadingTradition(
  profile: Pick<Profile, "faithChoice">,
): Tradition | null {
  return ["orthodox", "catholic", "protestant"].includes(
    profile.faithChoice ?? "",
  )
    ? (profile.faithChoice as Tradition)
    : null;
}
export function readingBooks(
  profile: Pick<Profile, "faithChoice" | "language">,
  allPerspectives = false,
  mood = "",
) {
  const tradition = chosenReadingTradition(profile);
  const ranked = ([...data.BOOKS, ...metadata.extraBooks] as ReadingBook[])
    .filter((book) => {
      const perspective = bookPerspective(book.id);
      return (
        allPerspectives ||
        !tradition ||
        perspective.kind === "general" ||
        (perspective.kind === "faith" &&
          perspective.traditions.includes(tradition))
      );
    })
    .sort((a, b) => {
      const rank = (book: ReadingBook) =>
        Number(book.moods.includes(mood)) * 2 +
        Number(
          book.language.startsWith(
            profile.language === "pt" ? "Português" : "English",
          ),
        );
      return rank(b) - rank(a);
    });
  return {
    tradition,
    faith: ranked.filter((b) => bookPerspective(b.id).kind === "faith"),
    general: ranked.filter((b) => bookPerspective(b.id).kind === "general"),
    unclassified: ranked.filter(
      (b) => bookPerspective(b.id).kind === "unclassified",
    ),
  };
}
