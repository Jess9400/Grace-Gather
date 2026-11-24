import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(root + file, "utf8");

test("the account menu lists Friends & chats before Pay it forward", () => {
  const menu = read("src/components/AccountMenuContent.tsx");
  assert.ok(menu.indexOf('"Friends & chats"') < menu.indexOf('"pay"'));
});

test("Pray for others never shows your own requests, and nobody reads 0 prayed", () => {
  const page = read("src/components/PrayerPage.tsx");
  assert.equal(page.match(/data\??\.requests\.filter\(\(p\) => !p\.own\)/g)?.length, 2);
  assert.match(page, /p\.count === 0\s*\?\s*tr\("Shared with the community\. We'll let you know when someone prays for you\."\)/);
  assert.match(page, /p\.count === 0\s*\?\s*tr\("Be the first to pray for this\."\)/);
  const copy = JSON.parse(read("src/lib/interface-translations.json"));
  for (const key of ["Shared with the community. We'll let you know when someone prays for you.", "1 person prayed for you", "Be the first to pray for this.", "1 person has prayed"])
    for (const language of ["pt", "es", "ru"]) assert.ok(copy[key]?.[language], `${language}: ${key}`);
});

test("someone without a public name is told first that nobody can see them yet", () => {
  const page = read("src/app/friends.tsx");
  assert.match(page, /directoryKnown && !hasName && !invitation && \(/);
  assert.match(page, /c\("You're not visible to others yet\."\)/);
});
