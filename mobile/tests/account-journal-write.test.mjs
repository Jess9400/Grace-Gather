import test from "node:test";
import assert from "node:assert/strict";
import { updateAccountJournal } from "../src/lib/account-journal-write.ts";

test("creates a missing journal", async () => {
  let stored = null;
  const store = {
    async read() {
      return stored;
    },
    async create(entries) {
      stored = { revision: 0, entries };
      return true;
    },
    async replace() {
      throw Error("unexpected replacement");
    },
  };
  assert.deepEqual(
    await updateAccountJournal(store, (entries) => [...entries, "first"]),
    ["first"],
  );
  assert.deepEqual(stored.entries, ["first"]);
});

test("reapplies the change after a concurrent write", async () => {
  let stored = { revision: 1, entries: ["first"] },
    attempts = 0;
  const store = {
    async read() {
      return structuredClone(stored);
    },
    async create() {
      throw Error("unexpected creation");
    },
    async replace(expected, entries) {
      if (attempts++ === 0) {
        stored = { revision: 2, entries: ["first", "other device"] };
        return false;
      }
      if (stored.revision !== expected) return false;
      stored = { revision: expected + 1, entries };
      return true;
    },
  };
  assert.deepEqual(
    await updateAccountJournal(store, (entries) => [...entries, "this device"]),
    ["first", "other device", "this device"],
  );
});

test("does not claim a save when conflicts do not resolve", async () => {
  let attempts = 0;
  const store = {
    async read() {
      return { revision: attempts, entries: [] };
    },
    async create() {
      return false;
    },
    async replace() {
      attempts++;
      return false;
    },
  };
  await assert.rejects(
    updateAccountJournal(store, () => ["pending"]),
    /journal_sync_conflict/,
  );
  assert.equal(attempts, 5);
});
