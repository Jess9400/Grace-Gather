import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const countries = JSON.parse(readFileSync(new URL("../src/generated/countries.json", import.meta.url)));
test("country options cover worldwide locations with stable codes and labels", () => {
  assert.ok(countries.length >= 240);
  assert.equal(new Set(countries.map((country) => country.code)).size, countries.length);
  for (const code of ["BR", "PT", "US", "GB", "IN", "RU"]) {
    const country = countries.find((item) => item.code === code);
    assert.ok(country, code);
    for (const language of ["en", "pt", "es", "ru"]) assert.ok(country[language], `${code}: ${language}`);
  }
  assert.equal(countries.find((country) => country.code === "BR").pt, "Brasil");
});
