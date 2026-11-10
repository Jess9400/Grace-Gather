import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const index = require("../src/generated/bible-dra/index.json");
const john = require("../src/generated/bible-dra/JHN.json");
const data = {
  collections: { dra: { index } },
  getBook: (code) => (code === "JHN" ? john : null),
  getReadingVerse: (id) => {
    const match = id.match(/^dra:JHN\.(\d+)\.(.+)$/);
    const verse =
      match && john.chapters[match[1]]?.find((v) => v.number === match[2]);
    return verse
      ? { id, text: verse.text, reference: `John ${match[1]}:${match[2]}` }
      : null;
  },
};
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL("../src/lib/bible-search.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
  { module, exports: module.exports, require: () => data },
);
const { searchBible } = module.exports;
test("references open the actual verse in the selected edition", () => {
  assert.equal(searchBible("dra", "John 3:16")[0].id, "dra:JHN.3.16");
  assert.equal(searchBible("dra", "João 3:16")[0].id, "dra:JHN.3.16");
  assert.equal(searchBible("dra", "John 3")[0].id, "dra:JHN.3.1");
  assert.equal(searchBible("dra", "John 999:1").length, 0);
});
test("text searches real scripture with a bounded number of matches", () => {
  const matches = searchBible("dra", "the world", 3);
  assert.equal(matches.length, 3);
  assert(matches.every((v) => v.text.toLowerCase().includes("the world")));
  assert.equal(searchBible("dra", "xyzzymissing").length, 0);
});
