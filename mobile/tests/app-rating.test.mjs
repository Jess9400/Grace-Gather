import test from "node:test";
import assert from "node:assert/strict";
import { recordVisit, readyForRating, inBibleStudy } from "../src/lib/app-rating.ts";

const date = (day, hour = 12) => new Date(2026, 0, day, hour);

test("waits two weeks and requires visits on three distinct local dates", () => {
  const first = recordVisit(null, date(1));
  assert.equal(recordVisit(first, date(1, 22)), first);
  const second = recordVisit(first, date(2));
  assert.equal(readyForRating(second, date(20)), false);
  const third = recordVisit(second, date(3));
  assert.equal(readyForRating(third, date(15, 11)), false);
  assert.equal(readyForRating(third, date(15)), true);
  assert.equal(recordVisit(third, date(20)), third);
  assert.equal(readyForRating({ ...third, requested: true }, date(40)), false);
});

test("only a visit originating in the Bible reader qualifies on return Home", () => {
  let study = false;
  const eligible = path => {
    const homeAfterStudy = path === "/" && study;
    study = inBibleStudy(path, study);
    return homeAfterStudy;
  };
  for (const path of ["/", "/diary", "/verse/example", "/"]) assert.equal(eligible(path), false);
  for (const path of ["/bible", "/verse/example", "/study"]) assert.equal(eligible(path), false);
  assert.equal(eligible("/"), true);
  for (const path of ["/", "/bible", "/prayers", "/", "/bible", "/confession", "/"]) assert.equal(eligible(path), false);
});
