import test from "node:test";
import assert from "node:assert/strict";
import {
  translationInput,
  translationOutput,
} from "../../supabase/functions/_shared/translation-policy.js";

test("translation accepts a bounded batch for a supported app language", () => {
  const input = translationInput({
    language: "pt",
    texts: ["Hello", "How are you?"],
  });
  assert.deepEqual(
    translationOutput(
      JSON.stringify({ translations: ["Olá", "Como você está?"] }),
      input,
    ),
    ["Olá", "Como você está?"],
  );
});
test("translation rejects malformed, oversized or mismatched content", () => {
  assert.throws(() => translationInput({ language: "xx", texts: ["Hi"] }));
  assert.throws(() =>
    translationInput({ language: "pt", texts: ["x".repeat(2001)] }),
  );
  assert.throws(() =>
    translationInput({ language: "pt", texts: Array(13).fill("a") }),
  );
  const input = translationInput({ language: "pt", texts: ["Hi", "Bye"] });
  assert.throws(() => translationOutput('{"translations":["Oi"]}', input));
  assert.throws(() => translationOutput('{"translations":["Oi", ""]}', input));
  assert.throws(() => translationOutput("not json", input));
});
