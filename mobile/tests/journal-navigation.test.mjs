import test from "node:test";
import assert from "node:assert/strict";
import { journalReturnId } from "../src/lib/journal-navigation.ts";

test("a journal return points only to an entry available on this device", () => {
  const entries = [{ id: "entry-one" }];
  assert.equal(journalReturnId("entry-one", entries), "entry-one");
  assert.equal(journalReturnId("missing", entries), undefined);
  assert.equal(journalReturnId(["entry-one"], entries), undefined);
  assert.equal(journalReturnId(undefined, entries), undefined);
});
