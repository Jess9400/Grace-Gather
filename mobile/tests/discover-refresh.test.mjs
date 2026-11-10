import test from "node:test";
import assert from "node:assert/strict";
import { mergeDiscoverPage } from "../src/lib/discover-page.ts";

const item = (number) => ({
  id: String(number).padStart(2, "0"),
  sort_at: `2026-11-${String(number).padStart(2, "0")}T00:00:00Z`,
});
test("a refresh adds new stories and keeps older pages without retaining removed recent items", () => {
  const old = Array.from({ length: 20 }, (_, i) => item(25 - i));
  const fresh = [
    item(27),
    item(26),
    ...old.filter((x) => x.id !== "23").slice(0, 13),
  ];
  const result = mergeDiscoverPage(old, fresh, false, true);
  assert.deepEqual(
    result.slice(0, 3).map((x) => x.id),
    ["27", "26", "25"],
  );
  assert(!result.some((x) => x.id === "23"));
  assert(result.some((x) => x.id === "06"));
  assert.equal(new Set(result.map((x) => x.id)).size, result.length);
});
test("a short refresh replaces the list, and pagination deduplicates", () => {
  assert.deepEqual(
    mergeDiscoverPage([item(2), item(1)], [item(2)], false, true),
    [item(2)],
  );
  assert.deepEqual(
    mergeDiscoverPage([item(2)], [item(2), item(1)], true, false),
    [item(2), item(1)],
  );
});
