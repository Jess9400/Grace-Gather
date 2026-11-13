import test from "node:test";
import assert from "node:assert/strict";
import { discussionVerseForLanguage } from "../src/lib/discussion-verse-language.ts";

test("discussion verses use a verified matching edition when available", () => {
  const curated = [{ id: "figueiredo-mateus-11-28", verse: "MAT.11.28" }];
  assert.equal(discussionVerseForLanguage("dra:MAT.11.28", "figueiredo", curated, false), "figueiredo-mateus-11-28");
  assert.equal(discussionVerseForLanguage("dra:MAT.11.28", "blivre", [], true), "blivre:MAT.11.28");
  assert.equal(discussionVerseForLanguage("dra:MAT.5.4", "figueiredo", curated, false), null);
  assert.equal(discussionVerseForLanguage("dra:PSA.23.1", "blivre", [], true), null);
  assert.equal(discussionVerseForLanguage("dra:MAT.5.4", "blivre", [], true), null);
  assert.equal(discussionVerseForLanguage("invalid", "blivre", [], true), null);
});
