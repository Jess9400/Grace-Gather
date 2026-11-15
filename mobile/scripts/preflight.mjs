import { readFile } from "node:fs/promises";
const release = process.env.RELEASE_BUILD === "true";
const testflight = process.env.TESTFLIGHT_BUILD === "true" && !release;
const androidPreview = process.env.ANDROID_PREVIEW_BUILD === "true" && !release && !testflight;
if (
  process.argv.includes("--if-release") &&
  !release &&
  !testflight &&
  !androidPreview
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
  ...(androidPreview ? ["ANDROID_PACKAGE_ID"] : ["APPLE_BUNDLE_ID"]),
];
const missing = required.filter((key) => !process.env[key]);
if (!testflight && !androidPreview) {
  for (const [key, value] of Object.entries(readiness))
    if (
      typeof value === "boolean" &&
      key !== "llmEnabled" &&
      !value &&
      (!key.startsWith("llm") || readiness.llmEnabled)
    )
      missing.push(key);
  for (const key of ["privacyPolicyUrl", "supportUrl"])
    if (!/^https:\/\//.test(readiness[key])) missing.push(key);
}
if (!androidPreview && process.env.APPLE_BUNDLE_ID?.includes("preview"))
  missing.push("production bundle identifier");
if (androidPreview && !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(process.env.ANDROID_PACKAGE_ID || ""))
  missing.push("valid Android package identifier");
if (missing.length) {
  console.error(
    `${testflight ? "TestFlight build" : androidPreview ? "Android preview" : "App Store release"} is blocked until these settings/checks are complete:\n` +
      missing.map((x) => " • " + x).join("\n"),
  );
  process.exit(1);
}
console.log(androidPreview
  ? "Android preview configuration checks passed. Public release readiness has not been verified."
  : testflight
  ? "TestFlight configuration checks passed. Public release readiness has not been verified."
  : "Release configuration checks passed. App Store approval is still required.");
