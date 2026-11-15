import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { canUseRemotePush } from "../src/lib/push-availability.js";

const script = new URL("../scripts/preflight.mjs", import.meta.url);
const run = (env) => spawnSync(process.execPath, [script.pathname, "--if-release"], {
  encoding: "utf8", env: { PATH: process.env.PATH, ...env },
});
const required = {
  ANDROID_PREVIEW_BUILD: "true",
  ANDROID_PACKAGE_ID: "com.graceandgather.preview",
  EXPO_PUBLIC_SUPABASE_URL: "https://example.invalid",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
  EXPO_PUBLIC_EAS_PROJECT_ID: "test-project",
};

test("Android preview requires a valid identity and connected backend", () => {
  const missing = run({ ANDROID_PREVIEW_BUILD: "true" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(missing.stderr, /ANDROID_PACKAGE_ID/);
  assert.equal(run({ ...required, ANDROID_PACKAGE_ID: "bad package" }).status, 1);
  assert.equal(run(required).status, 0);
});

test("Android preview cannot bypass public release checks", () => {
  const result = run({ ...required, RELEASE_BUILD: "true", APPLE_BUNDLE_ID: "com.example.app" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /privacyPolicyReviewed/);
});

test("Android preview profile produces a private installable APK for the existing Expo project", () => {
  const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
  const profile = eas.build["android-preview"];
  assert.equal(profile.distribution, "internal");
  assert.equal(profile.environment, "preview");
  assert.equal(profile.android.buildType, "apk");
  assert.equal(profile.env.ANDROID_PREVIEW_BUILD, "true");
  assert.equal(profile.env.ANDROID_PACKAGE_ID, "com.graceandgather.preview");
  assert.equal(profile.env.EXPO_PUBLIC_EAS_PROJECT_ID, eas.build.testflight.env.EXPO_PUBLIC_EAS_PROJECT_ID);
  assert.equal(profile.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED, "false");
  assert.equal(profile.env.EXPO_PUBLIC_ANDROID_REMOTE_PUSH_ENABLED, "false");
});

test("preview disables Android remote alerts without disabling iPhone alerts", () => {
  assert.equal(canUseRemotePush("android", "false"), false);
  assert.equal(canUseRemotePush("ios", "false"), true);
  assert.equal(canUseRemotePush("android", undefined), true);
});
