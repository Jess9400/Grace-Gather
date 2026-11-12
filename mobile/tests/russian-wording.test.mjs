import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
// Both modules are pure and import nothing at runtime.
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
const { pluralForm, replyCount } = load("src/lib/plural.ts");
const { setTraditionWording, traditionWording } = load(
  "src/lib/tradition-wording.ts",
);

test("reply counts use the right Russian form for any number", () => {
  const expected = {
    0: "0 ответов",
    1: "1 ответ",
    2: "2 ответа",
    4: "4 ответа",
    5: "5 ответов",
    11: "11 ответов",
    12: "12 ответов",
    21: "21 ответ",
    22: "22 ответа",
    101: "101 ответ",
    111: "111 ответов",
  };
  for (const [n, text] of Object.entries(expected))
    assert.equal(replyCount("ru", Number(n)), text);
});

test("other languages use singular and plural", () => {
  assert.equal(replyCount("en", 1), "1 reply");
  assert.equal(replyCount("en", 3), "3 replies");
  assert.equal(replyCount("pt", 1), "1 resposta");
  assert.equal(replyCount("es", 0), "0 respuestas");
  assert.equal(pluralForm("ru", 3, ["a", "b"]), "b");
});

test("Orthodox Russian users set a candle; everyone else lights one", () => {
  setTraditionWording(true, "ru");
  assert.equal(traditionWording("Зажечь свечу"), "Поставить свечу");
  assert.equal(
    traditionWording("Предложения зажечь свечу: включены"),
    "Предложения поставить свечу: включены",
  );
  assert.equal(
    traditionWording("Свечи, которые вы зажгли сегодня"),
    "Свечи, которые вы поставили сегодня",
  );
  setTraditionWording(false, "ru");
  assert.equal(traditionWording("Зажечь свечу"), "Зажечь свечу");
  setTraditionWording(true, "en");
  assert.equal(traditionWording("Light a candle"), "Light a candle");
});
