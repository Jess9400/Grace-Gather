import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(root + file, "utf8");

test("the personal reply is saved with the entry and shown above the verse", () => {
  const contract = read("src/lib/llm-contract.ts");
  assert.match(contract, /reflection: safeReflection\(candidate\.reflection\)/);
  for (const file of ["src/components/DiaryPage.tsx", "src/components/JournalGuidanceStatus.tsx"])
    assert.match(read(file), /suggestedReflection: result\.reflection/, file);
  // An edited entry never keeps the reply written for the old text.
  assert.match(read("src/components/DiaryPage.tsx"), /suggestedReflection: undefined/);
  assert.match(read("src/lib/journal-response.ts"), /reflection: safeReflection\(entry\.suggestedReflection\)/);
  const page = read("src/app/entry/[id].tsx");
  assert.ok(page.indexOf("displayResponse.reflection") < page.indexOf('jc(lang, "wordForYou")'));
  assert.match(read("src/lib/journal-export.ts"), /response\?\.reflection && !entry\.safety/);
  const backup = read("src/lib/journal-backup.ts");
  assert.match(backup, /e\.suggestedReflection\.length > 320/);
  assert.match(backup, /e\.response\.reflection\.length > 320/);
});
