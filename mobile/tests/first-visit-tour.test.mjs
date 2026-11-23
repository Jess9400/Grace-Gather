import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFileSync(root + file, "utf8");

test("a new member's first visit plays the whole church tour after the doors", () => {
  // The intro asks for the first tour when it ends.
  const intro = read("src/app/intro.tsx");
  const done = intro.slice(intro.indexOf("onDone="));
  assert.ok(done.indexOf("requestFirstChurchTour()") < done.indexOf("router.replace"));
  const home = read("src/app/(tabs)/index.tsx");
  assert.match(home, /if \(consumeFirstTour\(\)\) setFirstTour\(true\);/);
  // The doors finishing must not cancel it.
  assert.match(home, /if \(!firstTour\) setTour\(false\);/);
  // No skip button and no stepping out through a place during it.
  assert.match(home, /\{!firstTour && \(\s*<Pressable[\s\S]{0,120}onPress=\{endTour\}/);
  assert.match(home, /if \(touring && firstTour\) return;/);
  assert.match(home, /disabled=\{firstTour\}/);
  // A tour that cannot play never traps anyone, and the welcome card follows.
  assert.match(home, /setTimeout\(endTour, sceneFailed \? 0 : 60000\)/);
  const end = home.slice(home.indexOf("const endTour = useCallback"));
  assert.ok(end.indexOf("setInvitation(true)") < end.indexOf("}, []);"));
});
