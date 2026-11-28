export type StepWord = {
  id: string;
  strong: string;
  word: string;
  transliteration: string;
  grammar: string;
  gloss: string;
  language: string;
};
let loaded: Promise<StepWord[]> | undefined;
export function loadStepWords(): Promise<StepWord[]> {
  return (loaded ??= import("../generated/stepbible/lexicon.json")
    .then((m) => m.default)
    .catch((error) => {
      loaded = undefined;
      throw error;
    }));
}
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.\s-]/g, "");
const indexes = new WeakMap<
  StepWord[],
  { row: StepWord; text: string; id: string; strong: string }[]
>();
export function findStepWords(
  rows: StepWord[],
  query: string,
  language = "all",
): StepWord[] {
  const text = normalize(query.trim());
  if (!text) return [];
  const strong = /^([gh])(\d{1,4})([a-z]?)$/.exec(text);
  const id = strong ? strong[1] + strong[2].padStart(4, "0") + strong[3] : "";
  if (!id && text.length < 2) return [];
  let index = indexes.get(rows);
  if (!index) {
    index = rows.map((row) => ({
      row,
      text: [row.word, row.transliteration, row.gloss].map(normalize).join("|"),
      id: normalize(row.id),
      strong: normalize(row.strong),
    }));
    indexes.set(rows, index);
  }
  const matches: StepWord[] = [];
  for (const item of index) {
    if (language !== "all" && item.row.language !== language) continue;
    if (id ? item.id === id || item.strong === id : item.text.includes(text))
      matches.push(item.row);
    if (matches.length === 40) break;
  }
  return matches;
}
