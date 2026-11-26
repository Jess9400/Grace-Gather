import { readFile, writeFile, readdir } from "node:fs/promises";
const root = new URL("../content/devotionals/year1/", import.meta.url);
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const names = {
  en: "English",
  pt: "Português brasileiro",
  es: "Español",
  ru: "Русский",
};
const entries = [];
for (const file of (await readdir(root))
  .filter((f) => /^\d\d\.json$/.test(f))
  .sort())
  entries.push(...JSON.parse(await readFile(new URL(file, root), "utf8")));
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grace & Gather · Devotional review</title><style>body{background:#1b1612;color:#f4ebda;font:17px/1.6 system-ui;max-width:780px;margin:auto;padding:24px}h1,h2{font-family:Georgia}details{background:#2a221b;border-radius:18px;padding:18px;margin:16px 0}summary{cursor:pointer;font-weight:600}small{color:#b7a993}article{border-top:1px solid #f4ebda22;margin-top:22px}label{display:block;margin:10px 0}input{margin-right:10px}strong{color:#d9b974}</style><h1>Devotionals · first monthly batch</h1><p><strong>Drafts for Jessica and Taya to review together.</strong> ${entries.length} written of 365 scheduled. No professional theological review is claimed.</p><p>Check Scripture in context, natural translations, a distinct and safe action, and clear separation between Scripture and reflection. These checkboxes are a reading aid; they do not publish content or save approval.</p>${entries
  .map(
    (row) =>
      `<details><summary>Day ${row.day} · ${esc(row.en[0])}</summary><small>${esc(row.reference)}</small>${Object.entries(
        names,
      )
        .map(
          ([lang, name]) =>
            `<article lang="${lang}"><small>${name}</small><h2>${esc(row[lang][0])}</h2><p>${esc(row[lang][1])}</p><p><strong>${esc(row[lang][2])}</strong></p>${row[lang][3] ? `<p>${esc(row[lang][3])}</p>` : ""}</article>`,
        )
        .join(
          "",
        )}<label><input type="checkbox">Jessica reviewed this entry</label><label><input type="checkbox">Taya reviewed this entry</label></details>`,
  )
  .join("")}</html>`;
const output = process.argv[2] ?? "/tmp/grace-gather-devotional-review.html";
await writeFile(output, html);
console.log(output);
