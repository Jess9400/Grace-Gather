import test from "node:test";
import assert from "node:assert/strict";
import { profileSettings } from "../src/lib/profile-settings.ts";

test("profile sync retains account preferences without transferring journal consent or cleanup settings", () => {
  const profile = {
    name: "Friend",
    language: "pt",
    tradition: "catholic",
    onboarded: true,
    journalAIConsentVersion: "yes",
    deleteJournalChatsAfter90Days: true,
  };
  assert.deepEqual(profileSettings(profile), {
    name: "Friend",
    language: "pt",
    tradition: "catholic",
    onboarded: true,
  });
  assert.equal(profile.journalAIConsentVersion, "yes");
});
