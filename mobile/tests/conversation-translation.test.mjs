import test from "node:test";
import assert from "node:assert/strict";
import {
  translationInput,
  translationOutput,
} from "../../supabase/functions/_shared/translation-policy.js";

test("translation accepts a bounded batch for a supported app language", () => {
  const item = {source:"comment", id:"00000000-0000-0000-0000-000000000001"};
  assert.deepEqual(translationInput({language:"pt",items:[item]}),{language:"pt",items:[item]});
  const input = {language:"pt",texts:["Hello", "How are you?"]};
  assert.deepEqual(
    translationOutput(
      JSON.stringify({ translations: ["Olá", "Como você está?"] }),
      input,
    ),
    ["Olá", "Como você está?"],
  );
});
test("translation rejects malformed, oversized or mismatched content", () => {
  const item = {source:"comment", id:"00000000-0000-0000-0000-000000000001"};
  assert.throws(() => translationInput({ language: "xx", items:[item] }));
  assert.throws(() => translationInput({ language: "pt", texts: ["unverified private text"] }));
  assert.throws(() => translationInput({ language: "pt", items:[{...item,source:"unknown"}] }));
  assert.throws(() => translationInput({ language: "pt", items:Array(13).fill(item) }));
  const input = {language:"pt",texts:["Hi", "Bye"]};
  assert.throws(() => translationOutput('{"translations":["Oi"]}', input));
  assert.throws(() => translationOutput('{"translations":["Oi", ""]}', input));
  assert.throws(() => translationOutput("not json", input));
});
