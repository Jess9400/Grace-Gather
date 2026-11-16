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

test("matches Catholic numbering only where the actual Matos text was verified", () => {
  assert.deepEqual(asObject(sourceReference("matos:PSA.22.4")), {
    book: "PSA",
    chapter: 23,
    verse: 4,
  });
  assert.deepEqual(asObject(sourceReference("matos:MAT.5.5")), {
    book: "MAT",
    chapter: 5,
    verse: 4,
  });
  assert.deepEqual(asObject(sourceReference("matos:GEN.1.1")), {
    book: "GEN",
    chapter: 1,
    verse: 1,
  });
  assert.deepEqual(asObject(sourceReference("matos:GEN.1.4")), {
    book: "GEN", chapter: 1, verse: 4,
  });
  assert.equal(sourceReference("matos:GEN.1.32"), null);
  for (const [chapter, last] of [[2, 25], [3, 24], [4, 26], [5, 30], [6, 22], [7, 24], [8, 22], [9, 29], [10, 32], [11, 32]]) {
    assert.deepEqual(asObject(sourceReference(`matos:GEN.${chapter}.1`)), {
      book: "GEN", chapter, verse: 1,
    });
    assert.deepEqual(asObject(sourceReference(`matos:GEN.${chapter}.${last}`)), {
      book: "GEN", chapter, verse: last,
    });
    assert.equal(sourceReference(`matos:GEN.${chapter}.${last + 1}`), null);
  }
  for (const id of ["GEN.8.4", "GEN.8.6", "GEN.8.7", "GEN.10.15", "GEN.10.16", "GEN.10.17", "GEN.11.13"])
    assert.equal(sourceReference(`matos:${id}`), null);
  assert.deepEqual(asObject(sourceReference("matos:PSA.12.2")), {
    book: "PSA",
    chapter: 13,
    verse: 1,
  });
  assert.deepEqual(asObject(sourceReference("matos:PSA.72.23")), {
    book: "PSA",
    chapter: 73,
    verse: 23,
  });
  assert.equal(sourceReference("matos:PSA.12.1"), null);
  assert.equal(sourceReference("matos:PSA.23.4"), null);
  assert.equal(sourceReference("matos:MAT.5.4"), null);
  assert.equal(sourceReference("matos:TOB.1.1"), null);
});

test("Portuguese and Spanish references include their source's review status", () => {
  for (const lang of ["en", "pt", "es", "ru"]) {
    const rows = JSON.parse(
      readFileSync(
        resolve(root, `mobile/public/study-notes/v1/${lang}/JHN.json`),
        "utf8",
      ),
    );
    const found = selectOpenStudyNotes(rows, 3, 16, lang);
    assert.ok(found.detail, lang);
    if (lang === "pt" || lang === "es") {
      assert.equal(found.detail.reviewLevel, "None", lang);
      assert.ok(found.overview, lang);
    } else {
      assert.ok(rows.every((row) => row[5] === "Professional"), lang);
      assert.equal(found.overview, undefined, lang);
    }
    assert.equal(selectOpenStudyNotes(rows, 999, 999).detail, undefined);
  }
  const unreviewed = [[3001, 3021, "John 3", "text", "aquifer", "None"]];
  assert.equal(selectOpenStudyNotes(unreviewed, 3, 16).detail, undefined);
  assert.ok(selectOpenStudyNotes(unreviewed, 3, 16, "pt").detail);
  assert.ok(selectOpenStudyNotes(unreviewed, 3, 16, "es").detail);
  for (const lang of ["en", "pt", "es", "ru"]) {
    const dir = resolve(root, `mobile/public/study-notes/v1/${lang}`);
    for (const file of readdirSync(dir).filter((file) => file.endsWith(".json"))) {
      const rows = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
      if (lang === "en" || lang === "ru")
        assert.ok(rows.every((row) => row[5] === "Professional"), `${lang}/${file}`);
    }
  }
});

test("the Catholic Portuguese Genesis 1:4 can show passage context", () => {
  const ref = sourceReference("matos:GEN.1.4");
  const rows = JSON.parse(readFileSync(resolve(root, "mobile/public/study-notes/v1/pt/GEN.json"), "utf8"));
  const found = selectOpenStudyNotes(rows, ref.chapter, ref.verse, "pt");
  assert.ok(found.detail || found.overview);
  assert.match((found.detail ?? found.overview).title, /1/);
});

test("the website loading screen uses the current church emblem", () => {
  const page = readFileSync(resolve(root, "mobile/public/index.html"), "utf8");
  const emblem = readFileSync(
    resolve(root, "mobile/assets/brand/emblem.svg"),
    "utf8",
  );
  assert.ok(page.includes(emblem.match(/<path d="[^"]+"/)[0]));
  assert.ok(!page.includes("M46.5 41V29h7v12z"));
});
