import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const ts = createRequire(import.meta.url)("../node_modules/typescript");
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(readFileSync(root + "src/lib/home-notice.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { module, exports: module.exports },
);
const { freshNotice } = module.exports;
const zero = { messages: 0, prayers: 0, activity: 0, gatherings: 0 };

test("Home announces only what is new, most personal first", () => {
  assert.equal(freshNotice(zero, null), null);
  // Opening the app with something unread shows it once.
  assert.equal(freshNotice({ ...zero, prayers: 2 }, null), "prayers");
  // Already announced: nothing again.
  assert.equal(freshNotice({ ...zero, prayers: 2 }, { ...zero, prayers: 2 }), null);
  // A new message beats the others when several arrive together.
  assert.equal(freshNotice({ messages: 1, prayers: 3, activity: 1, gatherings: 1 }, { ...zero, prayers: 2 }), "messages");
  // Read elsewhere, then a new one: news again.
  assert.equal(freshNotice({ ...zero, activity: 1 }, { ...zero, activity: 0 }), "activity");
});

test("the notice names the newest item, opens it, and marks it read when opened", () => {
  const notice = readFileSync(root + "src/components/HomeNotice.tsx", "utf8");
  // Exact destinations, from the same calls the Notifications page uses.
  assert.match(notice, /rpc\("friend_unread_list"\)/);
  assert.match(notice, /params: \{ view: "friends", chat: chat\.link_id \}/);
  assert.match(notice, /href: activityDestination\(group\.item\)/);
  assert.match(notice, /activity_mark_read", \{ p_id: id \}/);
  assert.match(notice, /pathname: "\/gathering\/\[id\]", params: \{ id: item\.gathering_id \}/);
  assert.match(notice, /gathering_notifications", \{ p_read: item\.id \}/);
  assert.match(notice, /prayer_command", \{ p_action: "read", p_id: notice\.id/);
  // Read only when the person goes there; otherwise it simply fades.
  assert.match(notice, /onPress=\{\(\) => \{[\s\S]{0,400}item\s*\.markRead\(\)[\s\S]{0,200}router\.push\(item\?\.href \?\? notice\.href\)/);
  assert.match(notice, /const SHOWN_MS = 6000;/);
  const home = readFileSync(root + "src/app/(tabs)/index.tsx", "utf8");
  assert.match(home, /<HomeNotice visible=\{focused && !entrance && !touring\} \/>/);
});

test("Protestant members keep the church and get plain modern doors", () => {
  const home = readFileSync(root + "src/app/(tabs)/index.tsx", "utf8");
  assert.match(home, /isProtestant\(profile\)\s*\?\s*ProtestantEntrance/);
  assert.match(home, /return <ChurchEntrance \{\.\.\.props\} modern \/>;/);
  const scene = readFileSync(root + "src/lib/church-door-scene.ts", "utf8");
  assert.match(scene, /if \(modern\) \{\s*buildModernDoorway\(mesh\);\s*buildNave\(mesh\);/);
  // The modern doorway has no stone, arches, iron straps or ring pulls.
  const modern = scene.slice(scene.indexOf("function buildModernDoorway"), scene.indexOf("const VERTEX"));
  assert.doesNotMatch(modern, /KIND\.stone|archRing|archOutline|strap|Ring pull/);
  assert.match(modern, /kind: KIND\.veneer/);
  assert.match(readFileSync(root + "src/components/ChurchEntrance.tsx", "utf8"), /Platform\.OS !== "web",\s*modern,/);
});
