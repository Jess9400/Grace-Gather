import test from "node:test";
import assert from "node:assert/strict";
import { startChurchTour } from "../src/lib/church-tour.js";

function fakeClock() {
  let id = 0;
  const pending = new Map();
  return {
    schedule(fn) { const key = ++id; pending.set(key, fn); return key; },
    cancel(key) { pending.delete(key); },
    tick() { const [key, fn] = pending.entries().next().value; pending.delete(key); fn(); },
    count() { return pending.size; },
  };
}

test("the tour advances beyond gatherings and reaches every remaining stop", () => {
  const clock = fakeClock();
  const seen = [];
  let done = 0;
  startChurchTour(["confession", "gather", "bible", "candles", "pews", "journal"], {
    onStep: (place) => seen.push(place), onFadeOut: () => {}, onDone: () => done++,
    fadeMs: 400, schedule: clock.schedule, cancel: clock.cancel,
  });
  while (clock.count()) clock.tick();
  assert.deepEqual(seen, ["confession", "gather", "bible", "candles", "pews", "journal"]);
  assert.equal(done, 1);
});

test("leaving a tour cancels its pending steps", () => {
  const clock = fakeClock();
  const seen = [];
  let done = false;
  const stop = startChurchTour(["gather", "bible"], {
    onStep: (place) => seen.push(place), onFadeOut: () => {}, onDone: () => { done = true; },
    fadeMs: 400, schedule: clock.schedule, cancel: clock.cancel,
  });
  clock.tick();
  stop();
  assert.deepEqual(seen, ["gather"]);
  assert.equal(clock.count(), 0);
  assert.equal(done, false);
});
