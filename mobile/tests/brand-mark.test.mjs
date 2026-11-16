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
    // The bolder rendering used at the top of each screen.
    "assets/brand/emblem-small.svg",
    "assets/brand/emblem-small.png",
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
  // Every bar that writes the name shows the emblem too, including the bar
  // on pages opened over the tabs (ScreenNav), which has a Back arrow first.
  const branded = walk("src").filter((file) =>
    /GRACE (&|&amp;) GATHER/.test(read(file)),
  );
  assert.ok(branded.length >= 6);
  assert.ok(branded.some((file) => file.endsWith("ScreenNav.tsx")));
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

test("avatars sit on a dark disc with a gold ring, like the logo", () => {
  const avatar = read("src/components/MemberAvatar.tsx");
  assert.match(avatar, /const DISC = "#3A2E24";/);
  assert.match(avatar, /const RING = "#C9A45C";/);
  assert.match(avatar, /borderColor: RING/);
  // No pale pastel discs left to glow against the brown screens.
  assert.doesNotMatch(avatar, /#DFE9E4|#DDDDF0|#EEDDE4/);
});
