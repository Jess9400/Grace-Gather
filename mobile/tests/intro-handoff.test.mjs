import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/lib/intro-handoff.ts", import.meta.url),
  "utf8",
);

function setup() {
  let now = 0;
  let nextId = 0;
  const pending = new Map();
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
      setTimeout: (fn, delay) => {
        const id = ++nextId;
        pending.set(id, { fn, at: now + delay });
        return id;
      },
      clearTimeout: (id) => pending.delete(id),
    },
  );
  function advance(ms) {
    const end = now + ms;
    for (;;) {
      const item = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (!item || item[1].at > end) break;
      now = item[1].at;
      pending.delete(item[0]);
      item[1].fn();
    }
    now = end;
  }
  return { handoff: module.exports, advance };
}

test("the walk remains until the door is ready, then fades out", () => {
  const { handoff, advance } = setup();
  let changes = 0;
  const unsubscribe = handoff.subscribeIntroHandoff(() => changes++);
  handoff.beginIntroHandoff({ church: "catholic", language: "pt", moment: 2 });
  advance(3000);
  assert.equal(handoff.getIntroHandoff().church, "catholic");
  assert.equal(handoff.getIntroHandoff().moment, 2);
  assert.equal(handoff.getIntroHandoff().fading, false);
  handoff.releaseIntroHandoff();
  assert.equal(handoff.getIntroHandoff().fading, true);
  advance(handoff.INTRO_HANDOFF_FADE_MS - 1);
  assert.notEqual(handoff.getIntroHandoff(), null);
  advance(1);
  assert.equal(handoff.getIntroHandoff(), null);
  assert.equal(changes, 3);
  unsubscribe();
});

test("the cover clears even if the entrance never becomes ready", () => {
  const { handoff, advance } = setup();
  handoff.beginIntroHandoff({ church: "orthodox", language: "ru", moment: 1 });
  advance(handoff.INTRO_HANDOFF_TIMEOUT_MS);
  assert.equal(handoff.getIntroHandoff().fading, true);
  advance(handoff.INTRO_HANDOFF_FADE_MS);
  assert.equal(handoff.getIntroHandoff(), null);
});

test("an old release cannot interrupt a newer entrance", () => {
  const { handoff, advance } = setup();
  handoff.beginIntroHandoff({ church: "catholic", language: "en", moment: 2 });
  const oldId = handoff.getIntroHandoff().id;
  handoff.releaseIntroHandoff(oldId);
  handoff.beginIntroHandoff({
    church: "protestant",
    language: "en",
    moment: 0,
  });
  handoff.releaseIntroHandoff(oldId);
  advance(handoff.INTRO_HANDOFF_FADE_MS);
  assert.equal(handoff.getIntroHandoff().church, "protestant");
  assert.equal(handoff.getIntroHandoff().fading, false);
});
