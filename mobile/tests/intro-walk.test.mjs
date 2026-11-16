import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
// The module is pure and imports nothing at runtime.
function load(file) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(root + file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => assert.fail(`unexpected import ${name}`),
    },
  );
  return module.exports;
}
const walk = load("src/lib/intro-walk.ts");

test("the walk has three moments, in every language", () => {
  assert.equal(walk.INTRO_MOMENTS, 3);
  for (const language of ["en", "pt", "es", "ru"]) {
    const copy = walk.introCopy[language];
    assert.ok(copy.skip, language);
    assert.equal(copy.moments.length, walk.INTRO_MOMENTS, language);
    for (const moment of copy.moments) {
      assert.equal(moment.length, 3, language);
      for (const line of moment) assert.ok(line.trim().length > 3, language);
    }
  }
});

test("each step brings the church closer, ending at the door", () => {
  assert.equal(walk.CHURCH_SIZE.length, walk.INTRO_MOMENTS);
  let before = 0;
  for (let moment = 0; moment < walk.INTRO_MOMENTS; moment++) {
    const church = walk.churchOnRoad(moment);
    assert.equal(church.passed, false);
    assert.ok(Math.abs(church.size - walk.CHURCH_SIZE[moment]) < 1e-9);
    assert.ok(church.size > before);
    before = church.size;
  }
  // At the door the church is wider than the screen it is drawn for.
  assert.ok(before > 1);
});

test("nothing stands between the walker and the door at the end", () => {
  const end = walk.INTRO_MOMENTS - 1;
  for (const spot of [...walk.lanternSpots, ...walk.treeSpots])
    assert.equal(walk.placeOnRoad(end, spot.side, spot.along).passed, true);
});

test("the road is dark at the start and lanterns light on the way", () => {
  const lit = (moment) =>
    walk.lanternSpots.filter((spot) =>
      walk.lanternLit(moment, walk.placeOnRoad(moment, spot.side, spot.along)),
    ).length;
  assert.equal(lit(0), 0);
  assert.ok(lit(1) >= 2);
  // Every moment has its sky and its light.
  for (const name of [
    "STARS_SHOWN",
    "MOON_RISE",
    "HILLS_GROWN",
    "LIGHT_SIZE",
    "LIGHT_SHOWN",
  ])
    assert.equal(walk[name].length, walk.INTRO_MOMENTS, name);
});

test("on a phone the walk comes once, on the way into the church", () => {
  const read = (file) => readFileSync(root + file, "utf8");
  // The church (the tabs) sends people to the walk until it has been seen;
  // the tabs sit behind onboarding, so the walk comes after it.
  const tabs = read("src/app/(tabs)/_layout.tsx");
  assert.match(tabs, /if \(introPending\) return <Redirect href="\/intro" \/>/);
  const layout = read("src/app/_layout.tsx");
  assert.ok(
    layout.indexOf("guard={hasCompletedOnboarding(profile)}") <
      layout.indexOf('"(tabs)"'),
  );
  // Never on the web, where /intro stays a preview, and never when the
  // phone cannot say whether it was seen.
  const seen = read("src/lib/intro-seen.ts");
  assert.match(seen, /Platform\.OS === "web" \? false : null/);
  assert.match(seen, /\.catch\(\(\) => false\)/);
  // It is remembered before leaving, and the church's own doors are not
  // shown again straight after the walk's door.
  const page = read("src/app/intro.tsx");
  const done = page.slice(page.indexOf("onDone="));
  assert.ok(done.indexOf("markIntroSeen()") < done.indexOf("router.replace"));
  assert.ok(done.indexOf("markEntered()") < done.indexOf("router.replace"));
  // Signing in is not held up by it.
  assert.doesNotMatch(read("src/app/sign-in.tsx"), /intro/);
});

test("the phone draws the same walk from pictures of the web drawing", () => {
  const phone = readFileSync(root + "src/components/IntroWalk.tsx", "utf8");
  for (const name of [
    "church-catholic",
    "church-orthodox",
    "church-protestant",
    "tree",
    "lantern",
    "glow",
    "light",
    "moon",
    "hills",
    "road",
    "doorlight",
  ]) {
    assert.ok(phone.includes(`assets/intro/${name}.png`), name);
    assert.ok(
      readFileSync(root + `assets/intro/${name}.png`).length > 500,
      name,
    );
  }
  // Less motion: each moment appears at once.
  assert.match(phone, /isReduceMotionEnabled/);
  // The web keeps its own drawing and does not load the pictures.
  const web = readFileSync(root + "src/components/IntroWalk.web.tsx", "utf8");
  assert.doesNotMatch(web, /assets\/intro/);
});
