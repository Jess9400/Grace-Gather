import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("the generated iOS configuration describes the camera reference and microphone", () => {
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  const output = execFileSync(process.execPath, ["node_modules/expo/bin/cli", "config", "--type", "introspect", "--json"], { cwd, encoding: "utf8" });
  const info = JSON.parse(output).ios.infoPlist;
  assert.match(info.NSCameraUsageDescription, /camera/i);
  assert.match(info.NSCameraUsageDescription, /audio only/i);
  assert.ok(info.NSMicrophoneUsageDescription);
});
