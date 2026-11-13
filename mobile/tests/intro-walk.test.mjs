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

test("every language has the five moments of the walk", () => {
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
  for (const moment of [1, 2, 3])
    assert.ok(lit(moment) >= 2, `moment ${moment}`);
});

test("the intro stays a web preview: the phone app sends /intro home", () => {
  const page = readFileSync(root + "src/app/intro.tsx", "utf8");
  assert.match(page, /Platform\.OS !== "web"\) return <Redirect/);
  const phone = readFileSync(root + "src/components/IntroWalk.tsx", "utf8");
  assert.match(phone, /return null;/);
  // Nothing else in the app leads to it yet.
  const onboarding = readFileSync(root + "src/app/onboarding.tsx", "utf8");
  assert.doesNotMatch(onboarding, /\/intro/);
});
