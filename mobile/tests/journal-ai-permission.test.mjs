import test from "node:test";
import assert from "node:assert/strict";
import { saveJournalPermissionThenContinue } from "../src/lib/journal-ai-permission.js";

test("guidance continues only after the account permission has saved", async () => {
  const events = [];
  const profile = { language: "pt", name: "Test" };
  await saveJournalPermissionThenContinue(profile, "current", async (next) => {
    events.push(["saved", next.journalAIConsentVersion]);
  }, (next) => events.push(["continued", next.journalAIConsentVersion]));
  assert.deepEqual(events, [["saved", "current"], ["continued", "current"]]);
  assert.equal(profile.journalAIConsentVersion, undefined);
});

test("a failed or changed account prevents the AI continuation", async () => {
  let continued = false;
  await assert.rejects(saveJournalPermissionThenContinue({}, "current", async () => {
    throw Error("journal_account_changed");
  }, () => { continued = true; }));
  assert.equal(continued, false);
});
