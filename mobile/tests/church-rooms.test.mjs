import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
// church-room.ts only needs React for its hook; the geometry is pure.
const source = readFileSync(root + "src/lib/church-room.ts", "utf8");
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  {
    module,
    exports: module.exports,
    require: () => ({ useSyncExternalStore: () => null }),
    URL,
  },
);
const { roomCrop, roomGeometry, isRoomPlace, roomSpot } = module.exports;
const stage = { width: 390, height: 844 };

test("the walk-in lands each place on the same spot its strip shows it", () => {
  for (const place of [
    "bible",
    "pews",
    "gather",
    "candles",
    "window",
    "altar",
    "chats",
  ]) {
    const at = { x: 195, y: 420 };
    const crop = roomCrop(place, 47, at, stage, 390);
    // Away from the edges, the place sits at the strip's centre and focus line.
    assert.ok(Math.abs(crop.left + at.x * crop.zoom - 195) < 1e-9, place);
    assert.ok(
      Math.abs(crop.top + at.y * crop.zoom - crop.focusY) < 1e-9,
      place,
    );
    assert.ok(crop.focusY > 47 && crop.focusY < crop.height, place);
  }
});

test("near the edge of the church the picture still covers the whole strip", () => {
  const crop = roomCrop("gather", 0, { x: 10, y: 20 }, stage, 390);
  assert.ok(crop.left <= 0 && crop.left + crop.width >= 390);
  assert.ok(crop.top <= 0 && crop.top + crop.imageHeight >= crop.height);
});

test("the Bible keeps a shorter strip than the other rooms", () => {
  assert.ok(roomGeometry("bible", 0).height < roomGeometry("pews", 0).height);
});

test("only the church rooms walk in; Confession and the wreath open as before", () => {
  assert.deepEqual(
    ["bible", "pews", "gather", "candles", "confession", "wreath"].map(
      isRoomPlace,
    ),
    [true, true, true, true, false, false],
  );
});

test("Chats shows the side door; Discover and prayer requests have their own spots", () => {
  assert.equal(roomSpot("chats"), "gather");
  assert.equal(roomSpot("window"), "window");
  assert.equal(roomSpot("altar"), "altar");
  assert.ok(roomGeometry("chats", 0).height < roomGeometry("altar", 0).height);
});
