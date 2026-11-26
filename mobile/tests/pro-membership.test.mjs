import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript");
const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");
function moduleFor(file, mocks, billingEnabled = "true") {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(read(file), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      module,
      exports: module.exports,
      Error,
      Date,
      Intl,
      process: { env: { EXPO_PUBLIC_PRO_BILLING_ENABLED: billingEnabled } },
      require: (name) =>
        mocks[name] ??
        (name === "./storage"
          ? { getItem: async () => null, setItem: async () => {} }
          : undefined),
    },
  );
  return module.exports;
}
test("free or unavailable membership cannot run Pro; verified admin and paid accounts can", async () => {
  for (const [value, allowed] of [
    [{ plan: "free", admin: false }, false],
    [{ plan: "free", admin: false, enforced: true }, false],
    [{ plan: "free", admin: false, enforced: false }, true],
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

test("membership controls distinguish iPhone purchases, web access, and admins", () => {
  const { membershipPresentation: view } = moduleFor(
    "src/lib/membership-presentation.ts",
    {},
  );
  const free = { plan: "free", admin: false },
    pro = { plan: "pro", admin: false };
  assert.equal(view("membership", free, "ios").showOffers, true);
  assert.equal(view("membership", free, "ios").showRestore, true);
  assert.equal(view("membership", free, "web").showOffers, false);
  assert.equal(view("membership", free, "web").showRestore, false);
  assert.equal(view("membership", free, "web").showWebNotice, true);
  assert.equal(view("membership", pro, "web").showManage, true);
  assert.equal(view("membership", pro, "web").showRestore, false);
  assert.equal(view("membership", pro, "ios").showOffers, false);
  assert.equal(view("membership", pro, "ios").showRestore, true);
  const admin = view("membership", { plan: "pro", admin: true }, "ios");
  assert.equal(
    admin.showOffers || admin.showRestore || admin.showManage,
    false,
  );
  assert.equal(view("membership", null, "ios").showOffers, false);
});
test("all exhausted Pro allowances pause without another subscription pitch", () => {
  const { membershipPresentation: view } = moduleFor(
    "src/lib/membership-presentation.ts",
    {},
  );
  for (const reason of [
    "journal_entry_limit",
    "journal_followup_limit",
    "study_monthly_limit",
  ]) {
    for (const platform of ["ios", "web"]) {
      const result = view(reason, { plan: "pro", admin: false }, platform);
      assert.equal(result.paused, true);
      assert.equal(
        result.showBenefits ||
          result.showOffers ||
          result.showRestore ||
          result.showManage,
        false,
      );
    }
    assert.equal(
      view(reason, { plan: "free", admin: false }, "ios").showOffers,
      true,
    );
  }
});
test("membership is discoverable and account deletion never requires cancellation first", () => {
  const profile = read("src/app/profile.tsx");
  assert.match(profile, /showUpgrade\("membership"\)/);
  assert.match(profile, /deletionNotice/);
  assert.match(profile, /apps.apple.com\/account\/subscriptions/);
  assert.match(profile, /functions.invoke\(\s*"account-delete"/);
  const copy = JSON.parse(read("src/lib/membership-copy.json"));
  for (const language of ["en", "pt", "es", "ru"])
    for (const key of [
      "membership",
      "accessUntil",
      "webOnly",
      "deletionNotice",
      "statusUnavailable",
    ])
      assert.ok(copy[language][key]);
});

test("unfinished billing never locks existing Pro tools, even before the migration exists", async () => {
  for (const flag of [undefined, "false"]) {
    let reads = 0,
      runs = 0;
    const api = moduleFor(
      "src/lib/membership.ts",
      {
        "./backend": {
          requireUser: async () => {
            reads++;
            throw Error("migration not deployed");
          },
        },
      },
      flag === undefined ? "" : flag,
    );
    assert.equal(await api.requireProAction(() => runs++), true);
    assert.equal(runs, 1);
    assert.equal(reads, 0);
    assert.equal(api.upgradeSnapshot(), null);
  }
  const { membershipPresentation: view } = moduleFor(
    "src/lib/membership-presentation.ts",
    {},
  );
  const off = view("membership", { plan: "free", admin: false }, "ios", false);
  assert.equal(
    off.showOffers || off.showRestore || off.showManage || off.showBenefits,
    false,
  );
});

test("entering Pro offers the upgrade at most once a day", async () => {
  const saved = new Map();
  const api = moduleFor("src/lib/membership.ts", {
    "./backend": {
      requireUser: async () => ({
        client: {
          rpc: async () => ({
            data: { plan: "free", admin: false, enforced: true },
            error: null,
          }),
        },
      }),
    },
    "./storage": {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => void saved.set(key, value),
    },
  });
  await api.offerUpgradeOnVisit();
  assert.equal(api.upgradeSnapshot(), "pro");
  api.closeUpgrade();
  await api.offerUpgradeOnVisit();
  assert.equal(api.upgradeSnapshot(), null, "not again the same day");
  // A locked tool still offers it every time.
  assert.equal(await api.requireProAction(() => {}), false);
  assert.equal(api.upgradeSnapshot(), "pro");
  api.closeUpgrade();
  // With billing still switched off in the build, entering Pro offers nothing.
  const off = moduleFor("src/lib/membership.ts", {}, "false");
  await off.offerUpgradeOnVisit();
  assert.equal(off.upgradeSnapshot(), null);
});
