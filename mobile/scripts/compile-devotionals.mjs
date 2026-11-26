// Monthly editorial gate. Preview builds include drafts, production never does.
// To approve a batch, add a matching NN.review.json with status approved,
// reviewer, reviewedAt (ISO date) and languages en/pt/es/ru after reading it.
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = process.env.DEVOTIONAL_SOURCE_DIRECTORY
  ? new URL(
      "file://" + process.env.DEVOTIONAL_SOURCE_DIRECTORY.replace(/\/?$/, "/"),
    )
  : new URL("../content/devotionals/year1/", import.meta.url);
const preview =
  process.argv.includes("--preview") ||
  process.env.DEVOTIONAL_EDITORIAL_PREVIEW === "true";
const files = (await readdir(root))
  .filter((name) => /^\d{2}\.json$/.test(name))
  .sort();
const entries = [];
const hashes = new Map();
const languages = ["en", "pt", "es", "ru"];
for (const file of files) {
  const sourceText = await readFile(new URL(file, root), "utf8");
  const rows = JSON.parse(sourceText);
  const digest = createHash("sha256").update(sourceText).digest("hex");
  let review = null;
  try {
    review = JSON.parse(
      await readFile(
        new URL(file.replace(".json", ".review.json"), root),
        "utf8",
      ),
    );
  } catch {}
  const approved =
    review?.status === "approved" &&
    review.contentSha256 === digest &&
    Array.isArray(review.reviewers) &&
    review.reviewers.length === 2 &&
    review.reviewers.every(
      (r) =>
        typeof r.name === "string" &&
        r.name.trim().length > 1 &&
        r.approved === true,
    ) &&
    new Set(review.reviewers.map((r) => r.name.trim().toLowerCase())).size ===
      2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) &&
    languages.every((l) => review.languages?.includes(l));
  if (review?.status === "approved" && !approved)
    throw Error(`Incomplete review: ${file}`);
  for (const row of rows) {
    if (!/^[1-3]?[A-Z]{2,3}\.\d+\.\d+$/.test(row.reference))
      throw Error(`Invalid reference ${file}`);
    for (const lang of languages) {
      if (
        !Array.isArray(row[lang]) ||
        row[lang].length < 3 ||
        row[lang].some((s) => typeof s !== "string" || s.trim().length < 8)
      )
        throw Error(`Missing translation ${file}/${lang}`);
      // Reject reused whole reflections or actions in any language; also reject
      // punctuation/case edits that try to disguise identical content.
      for (const field of [1, 2]) {
        const normalized = row[lang][field]
          .normalize("NFKC")
          .toLowerCase()
          .replace(/[\p{P}\p{Z}]/gu, "");
        const hash = createHash("sha256").update(normalized).digest("hex");
        const key = `${lang}/${field}/${hash}`;
        if (hashes.has(key))
          throw Error(`Repeated content: ${file} and ${hashes.get(key)}`);
        hashes.set(key, file);
      }
    }
    if (
      !Number.isInteger(row.day) ||
      row.day < 1 ||
      row.day > 365 ||
      entries.some((entry) => entry.day === row.day)
    )
      throw Error("Invalid or duplicate day: " + file);
    entries.push({ ...row, approved, batch: file.slice(0, 2) });
  }
}
if (entries.length > 365) throw Error("Year one exceeds 365 days");
const byDay = new Map(entries.map((entry) => [entry.day, entry]));
const schedule = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 10, 25 + i)).toISOString().slice(0, 10);
  return {
    id: `gg-year1-d${String(i + 1).padStart(3, "0")}`,
    date,
    day: i + 1,
    status: byDay.get(i + 1)?.approved
      ? "approved"
      : byDay.get(i + 1)
        ? "draft"
        : "planned",
  };
});
const catalog = entries
  .sort((a, b) => a.day - b.day)
  .flatMap((entry) =>
    preview || entry.approved ? [{ ...entry, ...schedule[entry.day - 1] }] : [],
  );
const output = process.env.DEVOTIONAL_OUTPUT_DIRECTORY
  ? new URL(
      "file://" + process.env.DEVOTIONAL_OUTPUT_DIRECTORY.replace(/\/?$/, "/"),
    )
  : new URL("../src/generated/devotionals/", import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(
  new URL("catalog.json", output),
  JSON.stringify(catalog, null, 2) + "\n",
);
await writeFile(
  new URL("schedule.json", output),
  JSON.stringify(schedule, null, 2) + "\n",
);
console.log(
  `${entries.length}/365 drafted; ${entries.filter((e) => e.approved).length} approved; ${catalog.length} in ${preview ? "editorial preview" : "production"} catalog`,
);
if (
  process.argv.includes("--require-year") &&
  schedule.some((d) => d.status !== "approved")
)
  throw Error("The complete 365-day year is not approved");
