import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript"), mod = { exports: {} };
const source = readFileSync(new URL("../src/lib/gathering-list.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports });
const { nextSessionPerSeries } = mod.exports;
test("recurring gatherings show the next occurrence once without merging unrelated gatherings", () => {
  const sessions = [
    { id: "b", series_id: "weekly", starts_at: "2026-12-18T10:00:00Z" },
    { id: "a", series_id: "weekly", starts_at: "2026-12-11T10:00:00Z" },
    { id: "other", series_id: null, starts_at: "2026-12-12T10:00:00Z" },
  ];
  assert.deepEqual(Array.from(nextSessionPerSeries(sessions), item => item.id), ["a", "other"]);
  assert.deepEqual(Array.from(nextSessionPerSeries([sessions[0]]), item => item.id), ["b"]);
});
