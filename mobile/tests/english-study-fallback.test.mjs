import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
const cache = new Map();
function load(path) {
  if (!extname(path)) path += existsSync(path + ".ts") ? ".ts" : ".json";
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = readFileSync(path, "utf8");
  if (path.endsWith(".json")) module.exports = JSON.parse(source);
  else
    runInNewContext(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      {
        module,
        exports: module.exports,
        require: (name) =>
          name === "react-native"
            ? { Platform: { OS: "web" } }
            : load(resolve(dirname(path), name)),
        fetch: () => {
          throw Error("unexpected network request");
        },
      },
      { filename: path },
    );
  return module.exports;
}
const { sourceReference, selectOpenStudyNotes } = load(
  resolve(root, "mobile/src/lib/open-study-notes.ts"),
);
const asObject = (value) => value && JSON.parse(JSON.stringify(value));
const read = (file) => readFileSync(root + file, "utf8");

test("Russian New Testament verses reach the notes only where numbering matches", () => {
  assert.deepEqual(asObject(sourceReference("synodal:JHN.3.16")), { book: "JHN", chapter: 3, verse: 16 });
  assert.deepEqual(asObject(sourceReference("synodal:ROM.8.28")), { book: "ROM", chapter: 8, verse: 28 });
  // The English leaves out Luke 17:36; the other verses keep their numbers.
  assert.deepEqual(asObject(sourceReference("synodal:LUK.17.37")), { book: "LUK", chapter: 17, verse: 37 });
  // These chapters divide verses differently in the Synodal translation.
  for (const id of ["ACT.19.40", "2CO.11.32", "2CO.13.13"])
    assert.equal(sourceReference(`synodal:${id}`), null, id);
  // The Synodal Old Testament (Greek Psalm numbers and more) is not matched.
  assert.equal(sourceReference("synodal:GEN.1.4"), null);
  assert.equal(sourceReference("synodal:PSA.22.1"), null);
  // Only chapters whose verse numbers were compared are listed.
  const chapters = JSON.parse(read("mobile/src/lib/synodal-nt-chapters.json"));
  assert.equal(Object.values(chapters).flat().length, 257);
  assert.ok(!chapters.ACT.includes(19));
});

test("with nothing in the reader's language, the verse screen offers the English note", () => {
  const screen = read("mobile/src/app/verse/[id].tsx");
  assert.match(
    screen,
    /lang !== "en" &&\s*!explanation &&\s*!notesLoading &&\s*!notesUnavailable &&\s*!ownNotesFound/,
  );
  assert.match(screen, /fetchOpenStudyNotes\(id, "en"\)/);
  assert.match(screen, /Для этого стиха пока нет объяснения на русском, но есть на английском\./);
  assert.match(screen, /showEnglish && englishAvailable \? english : ownNotes/);
  // A verse with nothing in any language says so plainly.
  assert.doesNotMatch(screen, /still being prepared/);
  assert.match(screen, /no explanation for this verse yet, but one is coming soon/);
});
