import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
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

test("finds source notes in each language and does not use neighbouring passages", () => {
  for (const lang of ["en", "pt", "es", "ru"]) {
    const rows = JSON.parse(
      readFileSync(
        resolve(root, `mobile/public/study-notes/v1/${lang}/JHN.json`),
        "utf8",
      ),
    );
    const found = selectOpenStudyNotes(rows, 3, 16);
    assert.ok(found.overview, lang);
    assert.match(found.overview.title, /3/);
    assert.equal(selectOpenStudyNotes(rows, 999, 999).overview, undefined);
  }
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
