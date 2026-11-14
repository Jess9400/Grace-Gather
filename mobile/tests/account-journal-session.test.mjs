import test from "node:test";
import assert from "node:assert/strict";
import { createJournalSessionGate, planJournalImport } from "../src/lib/account-journal-session.ts";

test("late reads are rejected after signing out or switching accounts", () => {
  const gate = createJournalSessionGate();
  gate.switchOwner("A");
  const first = gate.capture();
  assert.equal(first.current(), true);
  gate.switchOwner("B");
  assert.equal(first.current(), false);
  const second = gate.capture();
  gate.switchOwner(null);
  assert.equal(second.current(), false);
  gate.switchOwner("A");
  assert.equal(first.current(), false);
});

test("legacy import preserves account entries and flags colliding IDs", () => {
  const account = [{ id: "one", text: "account" }];
  const device = [{ id: "one", text: "device" }, { id: "two", text: "new" }];
  assert.deepEqual(planJournalImport(account, device), {
    entries: [account[0], device[1]], conflicts: ["one"],
  });
});
