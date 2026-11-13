// Score the journal's backup theme reader (used when the AI is off or
// unavailable) on the test library of sample entries.
// usage, from the repository root: node scripts/journal-eval/score-backup.mjs
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve, extname } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = root + 'mobile/tests/fixtures/journal-entries/';
const require = createRequire(root + 'mobile/package.json');
const ts = require('typescript');
const cache = new Map();
function load(path) {
  if (!extname(path)) path += existsSync(path + '.ts') ? '.ts' : existsSync(path + '.js') ? '.js' : '.json';
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  let source = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) module.exports = JSON.parse(source);
  else runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: n => n.startsWith('.') ? load(resolve(dirname(path), n)) : require(n) }, { filename: path });
  return module.exports;
}
const { journalTheme } = load(root + 'mobile/src/lib/journal-guidance.ts');
const { quietMood } = load(root + 'mobile/src/generated/quiet-diary.js');
const entries = ['en', 'pt', 'es', 'ru'].flatMap(l => existsSync(fixtures + `${l}.json`) ? JSON.parse(readFileSync(fixtures + `${l}.json`, 'utf8')) : []);
const rows = entries.map(e => {
  const mood = quietMood(e.text, {}, e.lang);
  const got = journalTheme({ text: e.text, mood }).id;
  const verdict = got === e.expect ? 'right' : (e.also ?? []).includes(got) ? 'fair' : 'wrong';
  return { ...e, mood, got, verdict };
});
const tally = (list) => {
  const n = list.length, r = list.filter(x => x.verdict === 'right').length, f = list.filter(x => x.verdict === 'fair').length;
  return `${n} entries: ${r} right (${Math.round(100 * r / n)}%), ${f} fair, ${n - r - f} wrong (${Math.round(100 * (n - r - f) / n)}%)`;
};
console.log('Backup reader: ' + tally(rows));
for (const l of ['en', 'pt', 'es', 'ru']) { const s = rows.filter(x => x.lang === l); if (s.length) console.log('  ' + l + ': ' + tally(s)); }
for (const r of rows.filter((r) => r.verdict === 'wrong')) console.log(`  ${r.id}: expected ${r.expect}, got ${r.got}  "${r.text.slice(0, 70)}"`);
writeFileSync(process.cwd() + '/journal-backup-scorecard.json', JSON.stringify(rows, null, 1));
