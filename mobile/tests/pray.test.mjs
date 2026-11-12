import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
function load(file, modules = {}) {
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
      require: (name) => {
        assert.ok(name in modules, `unexpected import ${name}`);
        return modules[name];
      },
    },
  );
  return module.exports;
}
const { prayerList, namesPrayer, prayCopy } = load("src/lib/pray-copy.ts");
const geometry = load("src/lib/gl-mesh.ts");
const scene = load("src/lib/church-scene.ts", { "./gl-mesh": geometry });
const doors = load("src/lib/church-door-scene.ts", { "./gl-mesh": geometry });
const languages = ["en", "pt", "es", "ru"];

test("every prayer has a title, note and text in all four languages", () => {
  for (const language of languages) {
    const list = prayerList(language);
    assert.equal(list.length, 4);
    for (const prayer of list) {
      assert.ok(prayer.title && prayer.note);
      assert.ok(prayer.text.length > 30, `${language} ${prayer.id}`);
    }
  }
  assert.match(prayerList("ru")[0].text, /^Отче наш/);
});

test("the prayer for loved ones carries the names, living or departed", () => {
  for (const language of languages) {
    const living = namesPrayer(language, "health", "Maria, Nikolai");
    const departed = namesPrayer(language, "repose", "Anna");
    assert.ok(living.text.includes("Maria, Nikolai"));
    assert.ok(departed.text.includes("Anna"));
    assert.equal(living.title, prayCopy(language, "health"));
    assert.notEqual(living.text, departed.text);
  }
});

test("the Orthodox church has an icon to pray before and no pews", () => {
  const options = { adventWeek: 0, litVotives: 0 };
  const vertices = scene.buildChurchMesh({ ...options, orthodox: true });
  const general = scene.buildChurchMesh(options);
  // Pews fill the nave floor either side of the aisle, in front of the screen.
  const inPews = (mesh) => {
    let n = 0;
    for (let i = 0; i < mesh.length; i += 11)
      if (
        Math.abs(mesh[i]) > 0.4 &&
        Math.abs(mesh[i]) < 1.6 &&
        mesh[i + 2] > -1.5 &&
        mesh[i + 2] < 2.5 &&
        mesh[i + 1] > -1.4 &&
        mesh[i + 1] < -0.5
      )
        n++;
    return n;
  };
  assert.ok(inPews(general) > 0);
  assert.equal(inPews(vertices), 0);
  const anchors = scene.placeAnchors(false, true);
  assert.ok(anchors.pray && scene.PLACE_BOXES.pray);
  // The icon stands inside the view at the left, before the icon screen.
  assert.ok(anchors.pray[0] < -0.8 && anchors.pray[0] > -1.7);
});

test("the Orthodox entrance opens onto an icon screen, not stained glass", () => {
  const kinds = (mesh) => {
    const out = new Set();
    for (let i = 0; i < mesh.length; i += 11) out.add(mesh[i + 9]);
    return out;
  };
  const general = doors.buildChurchDoorMesh();
  const orthodox = doors.buildChurchDoorMesh(true);
  assert.ok(general.every(Number.isFinite) && orthodox.every(Number.isFinite));
  // Kind 7 is stained glass.
  assert.ok(kinds(general).has(7));
  assert.ok(!kinds(orthodox).has(7));
  assert.deepEqual(doors.buildChurchDoorMesh(false), general);
});
