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

test("unavailable Bible editions are not mapped to study notes", () => {
  assert.equal(sourceReference("matos:GEN.1.1"), null);
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

test("Portuguese Genesis 1:4 can show passage context", () => {
  const ref = sourceReference("blivre:GEN.1.4");
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
