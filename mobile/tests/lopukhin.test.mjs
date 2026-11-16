import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const read = (file) => readFileSync(root + file, "utf8");
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(read("src/lib/lopukhin.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { module, exports: module.exports, require: () => ({ Platform: { OS: "web" } }) },
);
const { LOPUKHIN_BOOKS, lopukhinReference, selectLopukhin, LOPUKHIN_CREDIT } = module.exports;
const dir = "public/study-notes/v1/lopukhin/";
const published = readdirSync(root + dir).map((f) => f.replace(".json", "")).sort();
const rows = (code) => JSON.parse(read(`${dir}${code}.json`));

test("only books whose commentator is clearly public domain are published", () => {
  assert.deepEqual(published, [...LOPUKHIN_BOOKS].sort());
  // Disputed authorship, unknown rehabilitation, still protected or unknown
  // death date: none of these may appear.
  for (const code of ["GEN", "EXO", "LEV", "NUM", "DEU", "RUT", "1SA", "2SA", "1KI", "2KI", "2CH",
    "EST", "PSA", "PRO", "SNG", "ISA", "EZK", "JON", "NAM", "HAB", "ZEP", "HAG", "ZEC",
    "ACT", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "1TH", "2TH", "HEB", "REV"])
    assert.ok(!published.includes(code), code);
  // The rights record lists every published book.
  const record = read("../docs/content-rights/lopukhin.md");
  for (const name of ["Matthew", "Mark, Luke, John", "Romans", "Joshua", "Judges", "Daniel", "Ecclesiastes", "Micah"])
    assert.ok(record.includes(name), name);
  assert.match(read("scripts/import-lopukhin.py"), /'Matt': 'MAT'/);
});

test("every note points at a verse printed in the app's Synodal Bible", () => {
  for (const code of published) {
    const bible = JSON.parse(read(`src/generated/bible-synodal/${code}.json`)).chapters;
    const verses = new Set(Object.entries(bible).flatMap(([c, list]) => list.map((v) => Number(c) * 1000 + Number(v.number))));
    for (const [first, last, text] of rows(code)) {
      assert.ok(text.length > 1, `${code} ${first}`);
      if (first % 1000 === 0) assert.ok(bible[first / 1000], `${code} chapter ${first / 1000}`);
      else assert.ok(verses.has(first), `${code} ${first}`);
      assert.ok(last >= first, `${code} ${first}`);
    }
  }
});

test("Daniel 3 follows the app's numbering, without the Greek additions", () => {
  const daniel = rows("DAN");
  const note = selectLopukhin(daniel, 3, 24).verse;
  assert.match(note, /Навуходоносор/);
  assert.match(note, /изумлени/);
  assert.ok(!daniel.some(([first]) => first >= 13000));
});

test("known transcription slips are corrected", () => {
  const romans = selectLopukhin(rows("ROM"), 8, 28).verse;
  assert.match(romans, /успокаивает христиан тем, что Бог/);
  // The introduction to Romans 8:28–39 was keyed to 28–29 in the transcription.
  assert.ok(rows("ROM").some(([first, last, text]) => first === 8028 && last === 8039 && /призвание ко Христу/.test(text)));
  assert.match(selectLopukhin(rows("JHN"), 3, 16).verse, /Бог до чрезвычайности любит людей/);
});

test("only Synodal verses of the published books reach the commentary", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(lopukhinReference("synodal:JHN.3.16"))), { book: "JHN", chapter: 3, verse: 16 });
  assert.equal(lopukhinReference("web:JHN.3.16"), null);
  assert.equal(lopukhinReference("synodal:PSA.22.1"), null);
  assert.equal(lopukhinReference("synodal:GEN.1.1"), null);
  const screen = read("src/app/verse/[id].tsx");
  assert.match(screen, /<Body small>\{LOPUKHIN_CREDIT\}<\/Body>/);
  // Shown under "Подробнее" only; "Простыми словами" points there.
  assert.equal((screen.match(/<LopukhinSection /g) ?? []).length, 1);
  assert.match(screen, /подробное толкование есть в разделе «Подробнее»/);
  assert.match(screen, /onPress=\{\(\) => setLayer\("deeper"\)\}/);
  assert.match(LOPUKHIN_CREDIT, /общественном достоянии/);
});
