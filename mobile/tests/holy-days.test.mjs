import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("../node_modules/typescript");
// Both modules are pure: the only runtime import is holy-days → church-calendar.
function load(file, modules = {}) {
  const module = { exports: {} };
  runInNewContext(
    ts.transpileModule(readFileSync(root + file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (name) => {
        assert.ok(name in modules, `unexpected import ${name}`);
        return modules[name];
      },
    },
  );
  return module.exports;
}
const churchCalendar = load("src/lib/church-calendar.ts");
const {
  westernEaster,
  orthodoxPascha,
  civilKey,
  holyDayCalendar,
  holyDaysForYear,
  holyDaysForMonth,
  holyDayArt,
  holyDayNames,
  holyDayName,
} = load("src/lib/holy-days.ts", { "./church-calendar": churchCalendar });

const catholic = { tradition: "catholic", faithChoice: "catholic" };
const protestant = { tradition: "protestant", faithChoice: "protestant" };
const orthodox = { tradition: "orthodox", faithChoice: "orthodox" };
const exploring = { tradition: "protestant", faithChoice: "exploring" };
// Each feast as "YYYY-MM-DD id", in calendar order. The module runs in its
// own context, so its arrays are copied into this one before comparing.
const listed = (profile, year) =>
  Array.from(holyDaysForYear(profile, year), (day) => `${day.date} ${day.id}`);
const western2026 = [
  "2026-01-06 epiphany",
  "2026-02-18 ashWednesday",
  "2026-03-29 palmSunday",
  "2026-04-03 goodFriday",
  "2026-04-05 easter",
  "2026-05-14 ascension",
  "2026-05-24 pentecost",
  "2026-11-29 adventSunday",
  "2026-12-25 christmas",
];
const withExtra = (days, ...extra) => [...days, ...extra].sort();

test("Western Easter matches the published dates", () => {
  assert.deepEqual(
    [2024, 2025, 2026, 2027].map((year) => civilKey(westernEaster(year))),
    ["2024-03-31", "2025-04-20", "2026-04-05", "2027-03-28"],
  );
  // The earliest and latest possible Easters.
  assert.equal(civilKey(westernEaster(1818)), "1818-03-22");
  assert.equal(civilKey(westernEaster(2038)), "2038-04-25");
});

test("Orthodox Pascha matches the published civil dates", () => {
  assert.deepEqual(
    [2024, 2025, 2026, 2027].map((year) => civilKey(orthodoxPascha(year))),
    ["2024-05-05", "2025-04-20", "2026-04-12", "2027-05-02"],
  );
  // From March 2100 the Julian calendar runs 14 days behind, not 13.
  assert.equal(civilKey(orthodoxPascha(2100)), "2100-05-02");
});

test("every Easter and Pascha falls on a Sunday", () => {
  for (let year = 1900; year <= 2200; year++)
    for (const date of [westernEaster(year), orthodoxPascha(year)])
      assert.equal(
        new Date(date.year, date.month - 1, date.day).getDay(),
        0,
        civilKey(date),
      );
});

test("a Catholic profile gets the Western days and the Catholic feasts", () => {
  assert.deepEqual(
    listed(catholic, 2026),
    withExtra(
      western2026,
      "2026-08-15 assumption",
      "2026-11-01 allSaints",
      "2026-12-08 immaculateConception",
    ),
  );
  assert.deepEqual(listed(catholic, 2027).slice(0, 5), [
    "2027-01-06 epiphany",
    "2027-02-10 ashWednesday",
    "2027-03-21 palmSunday",
    "2027-03-26 goodFriday",
    "2027-03-28 easter",
  ]);
});

test("a Protestant profile gets the Western days and Reformation Day", () => {
  assert.deepEqual(
    listed(protestant, 2026),
    withExtra(western2026, "2026-10-31 reformationDay"),
  );
  assert.deepEqual(listed(protestant, 2027).slice(0, 5), [
    "2027-01-06 epiphany",
    "2027-02-10 ashWednesday",
    "2027-03-21 palmSunday",
    "2027-03-26 goodFriday",
    "2027-03-28 easter",
  ]);
  assert.ok(!listed(protestant, 2026).some((day) => /assumption/.test(day)));
});

test("an Orthodox profile gets Pascha's days and both calendars' fixed feasts", () => {
  assert.deepEqual(listed(orthodox, 2026), [
    "2026-01-06 theophanyNew",
    "2026-01-07 nativityOld",
    "2026-01-19 theophanyOld",
    "2026-04-05 palmSunday",
    "2026-04-10 holyFriday",
    "2026-04-12 pascha",
    "2026-05-21 ascension",
    "2026-05-31 pentecost",
    "2026-12-25 nativityNew",
  ]);
  assert.deepEqual(listed(orthodox, 2027).slice(0, 6), [
    "2027-01-06 theophanyNew",
    "2027-01-07 nativityOld",
    "2027-01-19 theophanyOld",
    "2027-04-25 palmSunday",
    "2027-04-30 holyFriday",
    "2027-05-02 pascha",
  ]);
  // No Western Advent Sunday, and no Western names for the shared days.
  for (const year of [2026, 2027])
    for (const day of holyDaysForYear(orthodox, year))
      assert.ok(
        !["adventSunday", "christmas", "epiphany", "easter"].includes(day.id),
        day.id,
      );
});

test("exploring, skipped and never-asked profiles get only Christmas and Easter", () => {
  for (const profile of [
    exploring,
    { tradition: "catholic", faithChoice: "unspecified" },
    { tradition: "orthodox" },
  ]) {
    assert.equal(holyDayCalendar(profile), "general");
    assert.deepEqual(listed(profile, 2026), [
      "2026-04-05 easter",
      "2026-12-25 christmas",
    ]);
    assert.deepEqual(listed(profile, 2027), [
      "2027-03-28 easter",
      "2027-12-25 christmas",
    ]);
  }
});

test("a month lists only its own days, and no day carries two feasts", () => {
  assert.deepEqual(
    Array.from(holyDaysForMonth(catholic, 2026, 12), (day) => day.id),
    ["immaculateConception", "christmas"],
  );
  assert.equal(holyDaysForMonth(protestant, 2026, 7).length, 0);
  for (const profile of [catholic, protestant, orthodox, exploring])
    for (let year = 2020; year <= 2100; year++) {
      const dates = holyDaysForYear(profile, year).map((day) => day.date);
      assert.equal(new Set(dates).size, dates.length, `${year}`);
      assert.ok(dates.every((date) => date.startsWith(`${year}-`)));
    }
});

test("every holy day has a name in English, Portuguese, Spanish and Russian", () => {
  const shown = new Set();
  for (const profile of [catholic, protestant, orthodox, exploring])
    for (const day of holyDaysForYear(profile, 2026)) shown.add(day.id);
  // Every feast the calendar can show is named, and nothing named is unused.
  assert.deepEqual([...shown].sort(), Object.keys(holyDayNames).sort());
  for (const id of shown) {
    assert.deepEqual(Object.keys(holyDayNames[id]).sort(), [
      "en",
      "es",
      "pt",
      "ru",
    ]);
    for (const language of ["en", "pt", "es", "ru"]) {
      const name = holyDayName(id, language);
      assert.ok(typeof name === "string" && name.trim().length > 2, id);
      assert.equal(name, name.trim());
    }
    assert.match(holyDayNames[id].ru, /[а-яё]/i, id);
  }
  // The two calendars' feasts must be told apart in every language.
  for (const language of ["en", "pt", "es", "ru"]) {
    assert.notEqual(
      holyDayName("nativityNew", language),
      holyDayName("nativityOld", language),
    );
    assert.notEqual(
      holyDayName("theophanyNew", language),
      holyDayName("theophanyOld", language),
    );
  }
});

test("every holy day has its own illustration, drawn and shipped", () => {
  assert.deepEqual(
    Object.keys(holyDayArt).sort(),
    Object.keys(holyDayNames).sort(),
  );
  const images = readFileSync(root + "src/lib/holy-day-art.ts", "utf8");
  for (const [id, art] of Object.entries(holyDayArt)) {
    // The PNG the app shows, the SVG it was drawn as, and the require for it.
    assert.ok(
      existsSync(root + `assets/holy-days/${art}.png`),
      `${id}: ${art}.png`,
    );
    assert.ok(
      existsSync(root + `assets/holy-days/svg/${art}.svg`),
      `${id}: ${art}.svg`,
    );
    assert.ok(
      images.includes(`assets/holy-days/${art}.png`),
      `${id}: ${art} not wired`,
    );
  }
  // Christmas is a wreath and Easter is eggs; the Orthodox egg is red.
  assert.equal(holyDayArt.christmas, "wreath");
  assert.equal(holyDayArt.easter, "eggs");
  assert.equal(holyDayArt.pascha, "redegg");
});

test("Advent Sunday is the day the Advent wreath starts", () => {
  for (let year = 2024; year <= 2035; year++) {
    const advent = holyDaysForYear(protestant, year).find(
      (day) => day.id === "adventSunday",
    );
    const date = new Date(advent.year, advent.month - 1, advent.day);
    assert.equal(date.getDay(), 0);
    assert.equal(churchCalendar.westernAdventWeek(date), 1);
    date.setDate(date.getDate() - 1);
    assert.equal(churchCalendar.westernAdventWeek(date), 0);
  }
});

test("the dates are the same in every time zone", () => {
  const original = process.env.TZ;
  const all = () =>
    [catholic, protestant, orthodox, exploring]
      .flatMap((profile) =>
        // 2018 includes a São Paulo day that had no local midnight.
        [2018, 2026, 2027].flatMap((year) => listed(profile, year)),
      )
      .join("|");
  try {
    process.env.TZ = "UTC";
    const expected = all();
    for (const zone of [
      "Pacific/Kiritimati",
      "Pacific/Pago_Pago",
      "America/Sao_Paulo",
      "Europe/Moscow",
      "Australia/Lord_Howe",
    ]) {
      process.env.TZ = zone;
      assert.equal(all(), expected, zone);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
