import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("the avatar answers the first tap while the welcome card is showing", () => {
  const home = read("src/app/(tabs)/index.tsx");
  const closeLayer = home.indexOf('accessibilityLabel={t("dismissWelcome")}');
  const avatar = home.indexOf(
    'accessibilityLabel={tr("Account and settings")}',
  );
  assert.ok(closeLayer > 0 && avatar > 0);
  // Later elements are drawn on top: the layer that closes the card must
  // come before the header, or it swallows the tap meant for the avatar.
  assert.ok(closeLayer < avatar);
});

test("Offer comfort opens its page before the list arrives", () => {
  const room = read("src/app/(tabs)/confession.tsx");
  const start = room.indexOf("function offerComfort()");
  assert.ok(start > 0);
  const body = room.slice(start, room.indexOf("\n  }\n", start));
  assert.ok(
    body.indexOf('setPage("list")') < body.indexOf('await load("list")'),
  );
  // A list that cannot be fetched returns to the room, where the reason shows.
  assert.match(body, /catch \(e\) \{\s*setPage\("room"\);\s*throw e;/);
  assert.match(room, /onPress=\{offerComfort\}/);
});

test("the picture of the church does not lead anywhere when tapped", () => {
  const scene = read("src/components/LivingChurchScene.tsx");
  // No tap targets on the artwork: places are reached from tabs and buttons.
  assert.doesNotMatch(scene, /Pressable|onPress|onPlace/);
  const home = read("src/app/(tabs)/index.tsx");
  assert.doesNotMatch(home, /artworkPlaceAt|tapAnywhere|onPlace=/);
  // Tapping outside the welcome card only closes it.
  assert.match(
    home,
    /accessibilityLabel=\{t\("dismissWelcome"\)\}\s*onPress=\{dismissInvitation\}/,
  );
});

test("candles and the Orthodox prayer screen keep a button on Home", () => {
  const home = read("src/app/(tabs)/index.tsx");
  assert.match(
    home,
    /eastern \? \[placeButton\("pray", "image-frame", onCard\)\] : \[\]/,
  );
  assert.match(
    home,
    /candlesAllowed \? \[placeButton\("candles", "candle", onCard\)\] : \[\]/,
  );
  // On the welcome card, and beside "Talk to God" in the Orthodox church.
  assert.match(home, /\{placeButtons\(true\)\}/);
  assert.match(
    home,
    /eastern && !invitation && !entrance && !touring[\s\S]{0,120}placeButtons\(false\)/,
  );
});
