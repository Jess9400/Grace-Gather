// Cloudflare serves the web build, but a request for a file whose path holds
// "@" (here @expo/vector-icons) is redirected to itself until the browser
// gives up, so every icon in the app went missing. After `expo export`, move
// those files to a path without "@" and point the bundle at the new path.
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = process.argv[2] ?? "dist";
const from = "assets/node_modules/@expo";
const to = "assets/node_modules/expo-scoped";
if (!existsSync(join(dist, from))) {
  console.log(`web-assets: nothing at ${from}; leaving the build as it is.`);
  process.exit(0);
}
renameSync(join(dist, from), join(dist, to));
let rewritten = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|html|json|css)$/.test(name)) {
      const text = readFileSync(path, "utf8");
      if (text.includes(from)) {
        writeFileSync(path, text.split(from).join(to));
        rewritten++;
      }
    }
  }
}
walk(dist);
console.log(`web-assets: moved ${from} to ${to} and updated ${rewritten} file(s).`);
