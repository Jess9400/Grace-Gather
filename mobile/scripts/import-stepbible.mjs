// Import the scholarly lexical fields only. TBESH's longer Online Bible
// definitions have a separate permission notice and are deliberately omitted.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../src/generated/stepbible/", import.meta.url);
await mkdir(root, { recursive: true });
const entries = [];
const files = [];
for (const [tag, language] of [
  ["TBESG", "Greek"],
  ["TBESH", "Hebrew"],
]) {
  const name = `Lexicons/${tag} - Translators Brief lexicon of Extended Strongs for ${language} - STEPBible.org CC BY.txt`;
  const url = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/${encodeURI(name)}`;
  const text = process.env.STEP_IMPORT_DIRECTORY
    ? await readFile(
        `${process.env.STEP_IMPORT_DIRECTORY}/step-${language}.tsv`,
        "utf8",
      )
    : await fetch(url).then((r) => {
        if (!r.ok) throw Error(`STEP import failed: ${r.status}`);
        return r.text();
      });
  files.push({ url, sha256: createHash("sha256").update(text).digest("hex") });
  for (const line of text.split(/\r?\n/)) {
    const row = line.split("\t");
    if (!/^[GH]\d{4}/.test(row[0]) || row.length < 7) continue;
    entries.push({
      id: row[1].split(" ")[0],
      strong: row[0],
      word: row[3],
      transliteration: row[4],
      grammar: row[5],
      gloss: row[6],
      language:
        language === "Greek"
          ? "greek"
          : row[5].startsWith("A:") || /Aramaic/.test(row[1])
            ? "aramaic"
            : "hebrew",
    });
  }
}
const unique = [...new Map(entries.map((e) => [e.id, e])).values()];
if (unique.length < 15000) throw Error("STEP import incomplete");
await writeFile(new URL("lexicon.json", root), JSON.stringify(unique));
await writeFile(
  new URL("source.json", root),
  JSON.stringify(
    {
      name: "STEPBible",
      attribution:
        "Data created by STEPBible.org based on work at Tyndale House, Cambridge.",
      source: "https://github.com/STEPBible/STEPBible-Data",
      license: "https://creativecommons.org/licenses/by/4.0/",
      changes:
        "Selected lexical forms, transliterations, grammar codes and short glosses; removed longer definitions; converted TSV to JSON; classified Aramaic using source markers. Glosses remain in source English.",
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Imported ${unique.length} lexical entries`);
