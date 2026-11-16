import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("a place opens once, and Home always comes back to rest", () => {
  const home = read("src/app/(tabs)/index.tsx");
  const enter = home.slice(home.indexOf("const enter = ("));
  // A second tap during the walk must not open the place again.
  assert.ok(
    enter.indexOf("if (walking.current) return;") <
      enter.indexOf("arrive.current = go;"),
  );
  // Returning to Home resets the picture and controls even when no walk out
  // ran, and a walk that opened nothing walks back out.
  assert.match(home, /walk\.setValue\(0\);\s+chrome\.setValue\(1\);/);
  assert.match(home, /if \(!atHome\.current\) return;/);
});

test("tapping the candle brings its choices into view", () => {
  const candle = read("src/app/candle.tsx");
  assert.match(candle, /scrollToEndKey=\{phase === "choosing"/);
  const screen = read("src/components/quiet-ui.tsx");
  const room = screen.slice(
    screen.indexOf("if (strip && place)"),
    screen.indexOf("const avoid ="),
  );
  assert.match(room, /scrollToEnd\(\{ animated: true \}\)/);
});

test("a long journal entry scrolls inside the letter while writing", () => {
  const diary = read("src/components/DiaryPage.tsx");
  assert.match(diary, /paperWriting: \{ flex: 1/);
  assert.match(diary, /inputWriting: \{ flex: 1/);
  const screen = read("src/components/quiet-ui.tsx");
  assert.match(screen, /height: Math\.max\(viewport, COMPACT_MIN\)/);
  // The bar above the page already clears the status bar.
  assert.match(screen, /paddingTop: back \? 4 : insets\.top \+ 12/);
});

test("AI guidance is one line, with the disclosure one tap away", () => {
  const onboarding = read("src/app/onboarding.tsx");
  assert.match(onboarding, /jc\(p\.language, "aiShort"\)/);
  assert.match(onboarding, /aiCopy\(p\.language, "consent"\)/);
  const copy = read("src/lib/journal-copy.ts");
  const short = copy.slice(copy.indexOf("aiShort: ["));
  const lines = short.slice(0, short.indexOf("],")).match(/Alibaba Cloud/g);
  // Each language still names who receives the writing.
  assert.equal(lines?.length, 4);
});

test("the gatherings calendar has no legend line", () => {
  assert.doesNotMatch(read("src/components/GatheringCalendar.tsx"), /calendarLegend/);
  assert.doesNotMatch(read("src/lib/community-copy.ts"), /calendarLegend/);
});
