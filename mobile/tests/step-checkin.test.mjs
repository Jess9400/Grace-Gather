import test from "node:test";
import assert from "node:assert/strict";
import { pendingStep } from "../src/lib/step-checkin.js";

const entry = (step, extra = {}) => ({ id: "entry", step, ...extra });
const selected = (day, hour = 12) => ({
  id: "A04",
  chosenAt: new Date(2026, 10, day, hour).toISOString(),
});

test("a check-in follows a chosen action on the next local day", () => {
  const step = selected(10, 23);
  assert.equal(pendingStep([entry(undefined)], new Date(2026, 10, 11)), null);
  assert.equal(
    pendingStep([entry(step)], new Date(2026, 10, 10, 23, 59)),
    null,
  );
  assert.equal(
    pendingStep([entry(step)], new Date(2026, 10, 11, 0, 1)).step.id,
    "A04",
  );
});

test("dismissed, deleted, temporary, invalid and future actions do not prompt", () => {
  const now = new Date(2026, 10, 11, 12);
  for (const item of [
    entry({ ...selected(10), checkedAt: now.toISOString() }),
    entry({ ...selected(10), status: "done" }),
    entry(selected(10), { deletedAt: now.toISOString() }),
    entry(selected(10), { sessionOnly: true }),
    entry({ id: "A04", chosenAt: "invalid" }),
    entry(selected(12)),
  ]) {
    assert.equal(pendingStep([item], now), null);
  }
});

test("a check-in remains available if the member returns later", () => {
  assert.equal(
    pendingStep([entry(selected(1))], new Date(2026, 10, 11)).entry.id,
    "entry",
  );
});

test("the most recently selected eligible action takes priority", () => {
  const older = entry(selected(8), { id: "older" });
  const newer = entry(selected(10), { id: "newer" });
  assert.equal(
    pendingStep([older, newer], new Date(2026, 10, 11, 12)).entry.id,
    "newer",
  );
});
