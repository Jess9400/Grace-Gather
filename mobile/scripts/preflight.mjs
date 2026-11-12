import { readFile } from "node:fs/promises";
// TestFlight builds are for testing on real phones, which several review
// items below require, so they check only the app's configuration.
const testflight = process.env.TESTFLIGHT_BUILD === "true";
if (
  process.argv.includes("--if-release") &&
  process.env.RELEASE_BUILD !== "true" &&
  !testflight
)
  process.exit(0);
const readiness = JSON.parse(
  await readFile(
    new URL("../../release/readiness.json", import.meta.url),
    "utf8",
  ),
);
const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_EAS_PROJECT_ID",
  "APPLE_BUNDLE_ID",
];
const missing = required.filter((key) => !process.env[key]);
for (const [key, value] of Object.entries(testflight ? {} : readiness))
  if (
    typeof value === "boolean" &&
    key !== "llmEnabled" &&
    !value &&
    (!key.startsWith("llm") || readiness.llmEnabled)
  )
    missing.push(key);
for (const key of testflight ? [] : ["privacyPolicyUrl", "supportUrl"])
  if (!/^https:\/\//.test(readiness[key])) missing.push(key);
if (process.env.APPLE_BUNDLE_ID?.includes("preview"))
  missing.push("production bundle identifier");
if (missing.length) {
  console.error(
    (testflight
      ? "TestFlight build is blocked until these settings are set:\n"
      : "App Store release is blocked until these settings/checks are complete:\n") +
      missing.map((x) => " • " + x).join("\n"),
  );
  process.exit(1);
}
console.log(
  testflight
    ? "TestFlight configuration checks passed. The App Store checklist still applies before release."
    : "Release configuration checks passed. App Store approval is still required.",
);
