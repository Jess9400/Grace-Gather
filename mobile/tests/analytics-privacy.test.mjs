import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

test("analytics is private by design", () => {
  const analytics = readFileSync(root + "src/lib/analytics.ts", "utf8");
  assert.match(analytics, /enableSessionReplay: false/);
  assert.match(analytics, /personProfiles: "identified_only"/);
  assert.match(analytics, /__DEV__ \) return \(client = null\)|__DEV__\)\) return \(client = null\)/);
  assert.match(analytics, /https:\/\/eu\.i\.posthog\.com/);
  for (const file of files(root + "src")) {
    const source = readFileSync(file, "utf8");
    // No automatic tap capture, replay or screen recording anywhere.
    assert.doesNotMatch(source, /PostHogProvider|startSessionRecording|autocapture/, file);
    // Events carry only fixed details: never what someone wrote or their name.
    for (const call of source.matchAll(/track\("[a-z_]+"(?:, \{([^}]*)\})?\)/g))
      assert.doesNotMatch(call[1] ?? "", /\.text|name|reason|body|email|theme|message|title/i, `${file}: ${call[0]}`);
  }
});

test("people can switch it off, and the policy says so in every language", () => {
  const profile = readFileSync(root + "src/app/profile.tsx", "utf8");
  assert.match(profile, /void shareUsageData\(on\)/);
  const policy = readFileSync(root + "src/app/privacy.tsx", "utf8");
  for (const title of ["Usage analytics", "Estatísticas de uso", "Estadísticas de uso", "Статистика использования"])
    assert.ok(policy.includes(`"${title}"`), title);
});
