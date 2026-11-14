import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const read = (file) => readFileSync(root + file, "utf8");

test("the emblem and every icon made from it are in the app", () => {
  const app = JSON.parse(read("app.json")).expo;
  const files = [
    "assets/brand/emblem.svg",
    "assets/brand/emblem.png",
    app.icon,
    app.web.favicon,
    ...Object.values(app.android.adaptiveIcon).filter((v) =>
      v.endsWith(".png"),
    ),
  ];
  for (const file of files) assert.ok(existsSync(join(root, file)), file);
  // Android shows the emblem on candlelit espresso, not the old ivory.
  assert.equal(app.android.adaptiveIcon.backgroundColor, "#1B1612");
});

test("the written name is always accompanied by the emblem, never the old leaf", () => {
  const walk = (dir) =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : entry.name.endsWith(".tsx")
          ? [join(dir, entry.name)]
          : [],
    );
  // On pages opened over the tabs, the Back button takes the emblem's place
  // beside the name (ScreenNav), as the leaf's did before.
  const branded = walk("src").filter(
    (file) =>
      /GRACE (&|&amp;) GATHER/.test(read(file)) &&
      !file.endsWith("ScreenNav.tsx"),
  );
  assert.ok(branded.length >= 5);
  for (const file of branded) {
    const source = read(file);
    assert.match(source, /<BrandMark/, file);
    // The leaf may still mark other things (giving, a verse), but not the name.
    assert.doesNotMatch(
      source,
      /leaf-outline[^\n]*\n\s*<Text[^>]*>\s*GRACE/,
      file,
    );
  }
  assert.match(read("public/index.html"), /viewBox="0 0 100 100"/);
});
