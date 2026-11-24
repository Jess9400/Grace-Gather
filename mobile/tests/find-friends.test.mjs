import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const page = readFileSync(root + "src/app/friends.tsx", "utf8");

test("being findable is a visible switch, not a hidden setting", () => {
  assert.doesNotMatch(page, /Disclosure title=\{c\("Friend search settings"\)\}/);
  assert.match(page, /c\("How friends find you"\)/);
  assert.match(page, /<Switch[\s\S]{0,200}value=\{discoverable\}[\s\S]{0,60}onValueChange=\{setDiscoverable\}/);
  // An empty search says why, and a first visit starts from the profile name.
  assert.match(page, /They may not have turned on “Let members find me” yet\./);
  assert.match(page, /setName\(data\.me\?\.name \?\? profileName\.current \?\? ""\)/);
});

test("chat reports live in the Admin dashboard, not on Your people", () => {
  assert.doesNotMatch(page, /Chat reports/);
  assert.match(readFileSync(root + "src/app/admin/index.tsx", "utf8"), /queue === "chats"/);
});
