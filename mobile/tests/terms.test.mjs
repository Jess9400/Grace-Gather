import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");
const ts = createRequire(import.meta.url)("../node_modules/typescript");

function termsSections() {
  const source = read("src/lib/terms-content.ts");
  const start = source.indexOf("const terms = ");
  const end = source.indexOf("\n};\n", start) + 3;
  return runInNewContext("(" + source.slice(start + 14, end - 1) + ")");
}

test("the Terms of Use say the same things in all four languages", () => {
  const terms = termsSections();
  const sizes = ["en", "pt", "es", "ru"].map((l) => terms[l].length);
  assert.deepEqual(new Set(sizes).size, 1, String(sizes));
  for (const language of ["en", "pt", "es", "ru"]) {
    const text = terms[language].flat().join(" ");
    // Apple's guideline 1.2: zero tolerance, and action on reports.
    assert.match(text, /24/, language);
    assert.match(text, /hello@graceandgather\.online/, language);
  }
  assert.match(
    terms.en.flat().join(" "),
    /no tolerance for objectionable content/i,
  );
});

test("the church opens only after the Terms of Use are agreed", () => {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(read("src/lib/onboarding.ts"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    { module, exports: module.exports, require: () => ({}) },
  );
  const { hasCompletedOnboarding, TERMS_VERSION } = module.exports;
  const answered = {
    onboarded: true,
    faithChoice: "catholic",
    traditionQuestionVersion: 1,
  };
  assert.equal(hasCompletedOnboarding(answered), false);
  assert.equal(
    hasCompletedOnboarding({ ...answered, termsVersion: TERMS_VERSION }),
    true,
  );
  const layout = read("src/app/_layout.tsx");
  assert.match(layout, /guard=\{hasCompletedOnboarding\(profile\)\}/);
  // The terms and privacy pages open before signing in.
  assert.ok(
    layout.indexOf('name="terms"') < layout.indexOf("<Stack.Protected"),
  );
  const onboarding = read("src/app/onboarding.tsx");
  assert.match(onboarding, /<TermsAgreementNotice language=\{p.language\} action="continue"/);
  assert.match(onboarding, /onPress=\{\(\) => \{ update\(\{ termsVersion: TERMS_VERSION \}\); setStep\(1\); \}\}/);
  assert.match(onboarding, /termsVersion: TERMS_VERSION,/);
});
