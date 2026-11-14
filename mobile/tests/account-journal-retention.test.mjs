import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(file, dependencies = {}) {
  const source = readFileSync(
    new URL(`../src/lib/${file}.ts`, import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", "module", output)(
    (name) => {
      if (!(name in dependencies))
        throw Error(`unexpected dependency: ${name}`);
      return dependencies[name];
    },
    exports,
    { exports },
  );
  return exports;
}
const retention = load("journal-retention");
const { planAccountRetention } = load("account-journal-retention", {
  "./journal-retention": retention,
});
const now = Date.parse("2026-11-14T12:00:00Z");
const deleted = {
  id: "old",
  audio: "audio-1",
  deletedAt: "2026-09-01T00:00:00Z",
  createdAt: "2026-08-01T00:00:00Z",
};

test("expired audio is marked for deletion before removing its journal tombstone", () => {
  const first = planAccountRetention([deleted], false, now);
  assert.equal(first.entries.length, 1);
  assert.equal(first.audioToRemove[0].id, "old");
  assert.equal(first.entries[0].purgeRequestedAt, new Date(now).toISOString());
  const retry = planAccountRetention(first.entries, false, now + 5000);
  assert.equal(
    retry.audioToRemove[0].purgeRequestedAt,
    first.entries[0].purgeRequestedAt,
  );
});

test("a recording shared by a live entry is preserved", () => {
  const live = {
    id: "current",
    audio: "audio-1",
    createdAt: "2026-11-01T00:00:00Z",
  };
  const result = planAccountRetention([deleted, live], false, now);
  assert.deepEqual(result.entries, [live]);
  assert.deepEqual(result.audioToRemove, []);
});

test("a recoverable deletion is retained without scheduling audio deletion", () => {
  const recent = { ...deleted, deletedAt: "2026-11-10T00:00:00Z" };
  const result = planAccountRetention([recent], false, now);
  assert.deepEqual(result.entries, [recent]);
  assert.deepEqual(result.audioToRemove, []);
});
