import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
// Both modules are plain logic; the backend import is only used when sending.
function load(path) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(root + path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, require: () => ({}) },
  );
  return module.exports;
}
const { mergeGroupMessages, groupChatProblem, localized, GROUP_PAGE } = load(
  "src/lib/group-chats.ts",
);
const { friendCopy } = load("src/lib/friends-copy.ts");
const message = (n) => ({
  id: String(n).padStart(4, "0"),
  body: "m" + n,
  name: "A",
  mine: false,
  created_at: new Date(Date.UTC(2026, 10, 10, 0, n)).toISOString(),
});
const range = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => message(from + i));

test("a refresh drops messages that were removed or whose author was blocked", () => {
  // A short room is replaced outright by the newest page.
  const before = range(1, 5);
  const after = [message(1), message(2), message(4), message(5), message(6)];
  assert.deepEqual(
    mergeGroupMessages(before, after).map((m) => m.body),
    ["m1", "m2", "m4", "m5", "m6"],
  );
  assert.deepEqual(mergeGroupMessages(before, []), []);
});

test("older pages already loaded stay when the newest page is full", () => {
  const onScreen = range(1, 60); // an older page (1-10) plus the newest 50
  const newest = range(13, 62).filter((m) => m.body !== "m40");
  newest.unshift(message(12)); // still a full page of 50, with m40 removed
  assert.equal(newest.length, GROUP_PAGE);
  // Copied into this realm: the module runs in its own context.
  const merged = Array.from(mergeGroupMessages(onScreen, newest), (m) => m.body);
  assert.deepEqual(merged.slice(0, 11), range(1, 11).map((m) => m.body));
  assert.ok(!merged.includes("m40"));
  assert.equal(merged.at(-1), "m62");
  assert.equal(new Set(merged).size, merged.length);
});

test("server refusals map to something the screen can explain", () => {
  assert.equal(groupChatProblem({ message: "rate_limited" }), "rate_limited");
  assert.equal(groupChatProblem({ message: "name_required" }), "name_required");
  // The command does not exist until the database change is applied.
  assert.equal(groupChatProblem({ code: "PGRST202", message: "Could not find the function" }), "unavailable");
  assert.equal(groupChatProblem(new Error("network")), "failed");
  assert.equal(groupChatProblem(null), "failed");
});

test("room titles fall back to English when a language is missing", () => {
  assert.equal(localized({ en: "Everyone", pt: "Todos" }, "pt"), "Todos");
  assert.equal(localized({ en: "Everyone" }, "ru"), "Everyone");
  assert.equal(localized({}, "es"), "");
});

test("every sentence on the Your people screens exists in Portuguese, Spanish and Russian", () => {
  const sources = ["src/components/GroupChats.tsx", "src/app/friends.tsx"]
    .map((path) => readFileSync(root + path, "utf8"))
    .join("\n");
  const keys = new Set();
  for (const m of sources.matchAll(/\bc\(\s*"((?:[^"\\]|\\.)+)"/g)) keys.add(m[1]);
  for (const m of sources.matchAll(/setNotice\(\s*"((?:[^"\\]|\\.)+)"/g)) keys.add(m[1]);
  for (const m of sources.matchAll(/^\s+(?:unavailable|rate_limited|name_required|failed):\s*\n?\s*"((?:[^"\\]|\\.)+)"/gm)) keys.add(m[1]);
  assert.ok(keys.has("Your people") && keys.has("Group chats") && keys.size > 40, [...keys].length);
  // Words that are the same in that language as in English.
  const same = new Set(["es: Chat"]);
  for (const key of keys)
    for (const language of ["pt", "es", "ru"]) {
      const text = friendCopy(language, key);
      assert.ok(
        text && (text !== key || same.has(`${language}: ${key}`)),
        `${language}: ${key}`,
      );
    }
  assert.equal(friendCopy("en", "Your people"), "Your people");
});
