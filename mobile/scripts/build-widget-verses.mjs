// Copy only short readings from the editions already distributed in Bible Study.
import { readFileSync, writeFileSync } from "node:fs";
const generated = new URL("../src/generated/", import.meta.url);
const read = (path) =>
  JSON.parse(readFileSync(new URL(path, generated), "utf8"));
const { editions } = read("catalog.json");
const selections = {
  PRO: [
    "3:5",
    "3:6",
    "4:23",
    "11:2",
    "11:25",
    "12:25",
    "15:1",
    "15:13",
    "16:3",
    "16:9",
    "16:24",
    "17:17",
    "18:10",
    "19:17",
    "21:21",
    "27:17",
  ],
  ISA: ["12:3", "26:4", "40:8", "40:29", "55:6", "58:11"],
};
const result = {};
for (const edition of editions) {
  const verses = new Map();
  function add({ reference, text }) {
    if (text && text.length <= 90) verses.set(reference, text);
  }
  for (const passage of [...edition.passages, ...(edition.journalVerses ?? [])])
    add(passage);
  if (!["figueiredo", "torresamat"].includes(edition.id)) {
    const directory = edition.id === "web" ? "bible" : "bible-" + edition.id;
    for (const [code, refs] of Object.entries(selections)) {
      const book = read(directory + "/" + code + ".json");
      for (const ref of refs) {
        const [chapter, number] = ref.split(":");
        const verse = book.chapters[chapter].find((v) => v.number === number);
        if (verse)
          add({ reference: book.book.name + " " + ref, text: verse.text });
      }
    }
  }
  if (verses.size < 7) throw Error("Too few readings for " + edition.id);
  result[edition.id] = {
    name: edition.name,
    verses: Array.from(verses, ([reference, text]) => ({ reference, text })),
  };
}
writeFileSync(
  new URL("../targets/DailyVerse/verses.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
