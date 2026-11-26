import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript");
const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");
function moduleFor(file, mocks) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(read(file), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { module, exports: module.exports, Error, require: (name) => mocks[name] },
  );
  return module.exports;
}
test("free or unavailable membership cannot run Pro; verified admin and paid accounts can", async () => {
  for (const [value, allowed] of [
    [{ plan: "free", admin: false }, false],
    [{ plan: "pro", admin: false }, true],
    [{ plan: "free", admin: true }, true],
    [null, false],
  ]) {
    const api = moduleFor("src/lib/membership.ts", {
      "./backend": {
        requireUser: async () => ({
          client: { rpc: async () => ({ data: value, error: null }) },
        }),
      },
    });
    let ran = 0;
    assert.equal(await api.requireProAction(() => ran++), allowed);
    assert.equal(ran, Number(allowed));
    assert.equal(api.upgradeSnapshot(), allowed ? null : "pro");
    api.closeUpgrade();
    assert.equal(api.upgradeSnapshot(), null);
  }
});
test("quota errors open the relevant closeable sheet; unrelated provider errors do not", () => {
  const api = moduleFor("src/lib/membership.ts", {});
  for (const code of [
    "journal_entry_limit",
    "journal_followup_limit",
    "study_monthly_limit",
    "pro_required",
  ]) {
    assert.equal(api.upgradeForError(new Error(code)), true);
    assert.equal(api.upgradeSnapshot(), code === "pro_required" ? "pro" : code);
    api.closeUpgrade();
    assert.equal(api.upgradeSnapshot(), null);
  }
  assert.equal(api.upgradeForError(new Error("provider_busy")), false);
  assert.match(read("src/lib/ai-error.ts"), /study_monthly_limit/);
  assert.match(read("src/components/ProPaywall.tsx"), /studyResetsAt/);
  assert.match(
    read("src/components/ProPaywall.tsx"),
    /onRequestClose=\{closeUpgrade\}/,
  );
  assert.match(read("src/components/StudyAskAI.tsx"), /studyRemaining/);
});
test("server gates paid AI, separates monthly study from journal usage, and starts rollout off", () => {
  const sql = read(
    "../supabase/migrations/20261126102547_pro_membership_allowances.sql",
  );
  assert.match(sql, /role='admin'/);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /then 60 when pro then 3 else 1/);
  assert.match(sql, /study_monthly_limit/);
  assert.match(sql, /from public,anon,authenticated/);
  assert.match(sql, /enforced boolean not null default false/);
  assert.match(
    read("../supabase/functions/llm-journey/index.ts"),
    /finishJournal\(service,user.id,allowanceId\)\.catch/,
  );
  assert.match(
    read("../supabase/functions/bible-study/index.ts"),
    /requirePro\(client,service,user.id\)/,
  );
  assert.match(
    read("../supabase/functions/bible-study/index.ts"),
    /reserveJournal\(service,user.id,'study'/,
  );
});
test("checkout uses store prices, eligibility, account identity and backend verification", () => {
  const billing = read("src/lib/purchases.native.ts");
  assert.match(billing, /product.priceString/);
  assert.match(billing, /checkTrialOrIntroductoryPriceEligibility/);
  assert.match(billing, /syncPurchases/);
  assert.match(billing, /getAppUserID/);
  const server = read("../supabase/functions/_shared/pro-membership.ts");
  assert.match(server, /REVENUECAT_SECRET_KEY/);
  assert.match(server, /grace_gather_pro/);
  assert.match(server, /PRO_ALLOW_SANDBOX/);
  assert.match(server, /refunded_at/);
  const copy = JSON.parse(read("src/lib/membership-copy.json"));
  for (const lang of ["en", "pt", "es", "ru"])
    for (const key of [
      "entryLimit",
      "followupLimit",
      "studyLimit",
      "reset",
      "close",
      "restore",
      "renew",
    ])
      assert.ok(copy[lang][key]);
});
