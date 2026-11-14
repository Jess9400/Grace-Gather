import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("public and in-app privacy information stay in sync in every language", () => {
  const source = readFileSync(new URL("../src/app/privacy.tsx", import.meta.url), "utf8");
  const file = ts.createSourceFile("privacy.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let literal;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "policy") literal = node.initializer.getText(file);
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(literal);
  const policy = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  const html = readFileSync(new URL("../public/privacy.html", import.meta.url), "utf8");
  const escape = value => value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  for (const language of ["en", "pt", "es", "ru"]) {
    assert.match(html, new RegExp(`<article id="${language}" lang="${language}">`));
    for (const [title, body] of policy[language]) {
      assert.ok(html.includes(`<h2>${escape(title)}</h2><p>${escape(body)}</p>`), `${language}: ${title}`);
    }
  }
  for (const path of ["../public/privacy.html", "../public/support.html"]) {
    const content = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.ok(content.includes("mailto:hello@graceandgather.online"));
    assert.ok(!content.includes("hello@graceandgather.com"));
  }
});
