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

test("a friend link adds someone you know, after showing whose link it is", () => {
  // Shared from Your people, with the person's private token.
  assert.match(page, /c\("Share my friend link"\)/);
  assert.match(page, /friendLinkUrl\(token\)/);
  assert.match(readFileSync(root + "src/lib/friends.ts", "utf8"), /friends\?view=friends&add=" \+\s*encodeURIComponent\(token\)/);
  // Opening it previews the name first; adding needs a tap and a public name.
  assert.match(page, /friendInvite\("preview", \{ token: params\.add \}\)/);
  assert.match(page, /if \(!hasName\) await friends\("directory", \{ name, discoverable \}\);\s*await friendInvite\("accept", \{ token: params\.add \}\);/);
  // Making a new link turns the old one off.
  assert.match(page, /await friendInvite\("reset"\)/);
});

test("saving the find-me settings folds them into one line with a short Saved", () => {
  assert.match(page, /setEditingFindable\(false\);\s*setSavedFlash\(true\);/);
  assert.match(page, /setTimeout\(\(\) => setSavedFlash\(false\), 3000\)/);
  assert.match(page, /c\("Friends can find you as \{name\}\."\)/);
  assert.match(page, /onPress=\{\(\) => setEditingFindable\(true\)\}/);
});

test("Find friends and Share my friend link sit above the list of friends", () => {
  const actions = page.indexOf("<View style={s.topActions}>");
  assert.ok(actions > 0);
  assert.ok(actions < page.indexOf("{pending.map((l) => ("), "above requests");
  assert.ok(actions < page.indexOf("{accepted.length ? ("), "above friends");
  // The search opens right under the buttons, before the list.
  assert.ok(page.indexOf("{finding && (") < page.indexOf("{accepted.length ? ("));
});
