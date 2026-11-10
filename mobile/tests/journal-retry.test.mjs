import test from "node:test";
import assert from "node:assert/strict";
import { applyRetriedGuidance } from "../src/lib/journal-retry.ts";

test("a retried response preserves writing and conversation and clears the failure", () => {
  const original = {
    id: "a",
    text: "my writing",
    aiUnavailable: true,
    safety: false,
    mood: "unsure",
    conversation: [{ id: "message" }],
  };
  const response = { actionId: "A01", verse: null };
  const [saved] = applyRetriedGuidance([original], "a", original.text, {
    guidance: "ai",
    response,
  });
  assert.equal(saved.text, original.text);
  assert.deepEqual(saved.conversation, original.conversation);
  assert.equal(saved.response, response);
  assert.equal(saved.aiUnavailable, false);
});
test("a retry cannot resurrect a deleted entry or overwrite changed writing", () => {
  const original = { id: "a", text: "edited", aiUnavailable: true };
  assert.throws(
    () => applyRetriedGuidance([original], "a", "old writing", {}),
    /entry_changed/,
  );
  assert.throws(
    () =>
      applyRetriedGuidance(
        [{ ...original, deletedAt: "now" }],
        "a",
        "edited",
        {},
      ),
    /entry_changed/,
  );
  assert.throws(
    () => applyRetriedGuidance([], "a", "edited", {}),
    /entry_changed/,
  );
});
