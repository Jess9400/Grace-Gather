import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
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
const { friendCopy } = load("src/lib/friends-copy.ts");
const { roomTheme, avatarColor, initial } = load("src/lib/people-theme.ts");
const source = (path) => readFileSync(root + path, "utf8");

test("every sentence on Your people exists in Portuguese, Spanish and Russian", () => {
  const sources = ["src/components/Discussions.tsx", "src/app/friends.tsx"]
    .map(source)
    .join("\n");
  const keys = new Set();
  for (const m of sources.matchAll(/\bc\(\s*"((?:[^"\\]|\\.)+)"/g)) keys.add(m[1]);
  for (const m of sources.matchAll(/setNotice\(\s*"((?:[^"\\]|\\.)+)"/g)) keys.add(m[1]);
  // Tab titles and two-way wording sit in arrays or conditionals.
  for (const m of sources.matchAll(/\["(?:discussions|friends)",\s*"([^"]+)"\]/g)) keys.add(m[1]);
  for (const m of sources.matchAll(/\?\s*"((?:[^"\\]|\\.){3,})"\s*:\s*"((?:[^"\\]|\\.){3,})"/g)) {
    keys.add(m[1]);
    keys.add(m[2]);
  }
  for (const expected of ["Your people", "Discussions", "Friends", "Start a discussion", "Being checked"])
    assert.ok(keys.has(expected), expected);
  assert.ok(keys.size > 45, String(keys.size));
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
});

test("each discussion and each person keeps one colour", () => {
  const ids = ["a1", "b2", "c3", "d4", "e5", "f6", "g7", "h8"];
  for (const id of ids) {
    assert.deepEqual(roomTheme(id), roomTheme(id));
    assert.match(roomTheme(id).tint, /^#[0-9A-F]{6}$/i);
  }
  // A list of discussions is not all one colour.
  assert.ok(new Set(ids.map((id) => roomTheme(id).tint)).size >= 3);
  assert.equal(avatarColor("Sofia"), avatarColor("Sofia"));
  assert.equal(initial("  sofia"), "S");
  assert.equal(initial("Élise"), "É");
  assert.equal(initial(""), "·");
});

test("discussions live in one place and every other link leads there", () => {
  // The old page only passes people on.
  const old = source("src/app/community.tsx");
  assert.match(old, /Redirect/);
  assert.match(old, /pathname: "\/friends"/);
  assert.ok(old.length < 1200, "the old page should only redirect");
  // Profile menu, the Bible tab and Discover no longer open a second page.
  assert.match(source("src/components/AccountMenuContent.tsx"), /route="\/friends"/);
  assert.doesNotMatch(source("src/components/AccountMenuContent.tsx"), /route="\/community"/);
  assert.doesNotMatch(source("src/app/(tabs)/bible.tsx"), /push\("\/community"\)/);
  assert.match(source("src/app/(tabs)/explore.tsx"), /Redirect href="\/friends"/);
  // The separate group chat is gone from the app.
  assert.ok(!existsSync(root + "src/components/GroupChats.tsx"));
  assert.doesNotMatch(source("src/app/friends.tsx"), /group_chat|GroupChats/);
});

test("the Refresh buttons are gone from the screens that refresh themselves", () => {
  for (const path of [
    "src/app/friends.tsx",
    "src/components/Discussions.tsx",
    "src/components/PrayerPage.tsx",
    "src/app/giving.tsx",
    "src/app/(tabs)/explore.tsx",
  ]) {
    assert.doesNotMatch(source(path), /"Refresh"|refresh-outline/, path);
    assert.match(source(path) + source("src/lib/prayers.ts"), /setInterval/, path);
  }
});
