import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unclearWriting, UNCLEAR_REPLY } from "../shared/unclear-writing.js";

test("nonsense and test entries are recognised in every language", () => {
  for (const text of [
    "asdkjh qwe zxc", "test", "lalala bla bla 123", "fhfhfhf", "qwerty", "123 456", "...", "🙏",
    "teste teste", "prueba", "тест", "йцукен фыва", "ааааа", "sdfsdf ghghgh", "xcvbnm",
  ])
    assert.equal(unclearWriting(text), true, text);
});

test("real writing is never treated as nonsense, however short", () => {
  for (const text of [
    "Sad", "Amen", "Help me", "ok", "Hello", "Psalm 23", "Mark 1", "pls help",
    "I feel so alone tonight", "Thank you God", "hmm I do not know", "I failed my test today",
    "Brrr cold morning but grateful", "Hoje foi difícil", "Deus, me ajuda", "vc tb sente isso?",
    "Estoy cansada", "Gracias, Señor", "Мне плохо", "Спасибо, Господи", "Не знаю, что сказать",
  ])
    assert.equal(unclearWriting(text), false, text);
  // Voice-only or feelings-only entries have no text to judge.
  assert.equal(unclearWriting(""), false);
});

test("the app and the server use the same check and a reply in every language", () => {
  const shared = readFileSync(new URL("../shared/unclear-writing.js", import.meta.url), "utf8");
  for (const copy of ["../mobile/src/generated/unclear-writing.js", "../supabase/functions/_shared/unclear-writing.js"])
    assert.equal(readFileSync(new URL(copy, import.meta.url), "utf8"), shared, copy);
  for (const language of ["en", "pt", "es", "ru"]) {
    assert.ok(UNCLEAR_REPLY[language].length <= 320, language);
    assert.doesNotMatch(UNCLEAR_REPLY[language], /[\r\n<>]/);
  }
});
