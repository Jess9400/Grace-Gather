import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript');
const cache = new Map();
function load(path) {
  if (!extname(path)) path += existsSync(path + '.ts') ? '.ts' : '.json';
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) module.exports = JSON.parse(source);
  else runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: name => load(resolve(dirname(path), name)) }, { filename: path });
  return module.exports;
}
const reader = load(resolve(root, 'mobile/src/lib/bible.ts'));
const { translatedStudy } = load(resolve(root, 'mobile/src/lib/bible-study-translations.ts'));
const { studies } = JSON.parse(readFileSync(root + 'mobile/src/lib/bible-study-translations.json', 'utf8'));
const english = Object.fromEntries(JSON.parse(readFileSync(root + 'mobile/src/generated/quiet-studies.json', 'utf8')).verses.map(v => [v.id, v]));
await Promise.all(['web', 'dra', 'brenton', 'blivre', 'rv1909', 'synodal'].map(id => reader.ensureCollection(id)));
const fields = ['simple', 'context', 'meaning', 'theology', 'today', 'question'];
const languages = ['pt', 'es', 'ru'];

test('the English-only studies have Portuguese, Spanish and Russian versions', () => {
  assert.deepEqual(Object.keys(studies).sort(), [
    'brenton-psalm-106-1', 'brenton-psalm-4-9', 'brenton-psalm-99-3',
    'web-genesis-1-1', 'web-genesis-1-2', 'web-genesis-1-3', 'web-john-15-9',
  ]);
  for (const [id, entry] of Object.entries(studies)) {
    assert.ok(english[id], id);
    assert.deepEqual(Object.keys(entry.languages).sort(), [...languages].sort(), id);
    for (const language of languages) {
      const study = entry.languages[language], where = `${id} ${language}`;
      for (const field of fields) assert.ok(study[field]?.trim().length >= 25, `${where} ${field}`);
      assert.match(study.question, /\?$/, where);
      // Same teaching points and differences as the English study.
      assert.equal(study.teaching?.length ?? 0, english[id].teaching?.length ?? 0, `${where} teaching`);
      assert.equal(study.differences?.length ?? 0, english[id].differences?.length ?? 0, `${where} differences`);
      for (const word of study.words ?? []) assert.ok(word.term && word.original && word.meaning, where);
      // Written for this language, not copied from another.
      for (const other of languages) if (other !== language) assert.notEqual(study.simple, entry.languages[other].simple, where);
      assert.notEqual(study.simple, english[id].simple, where);
    }
    // Same sources as the English study.
    assert.deepEqual(entry.sources, english[id].sources, id);
  }
});

test('each translation is reached from the verse in the reader’s own Bible', () => {
  for (const [id, entry] of Object.entries(studies)) for (const verseId of entry.verses) {
    assert.ok(reader.getReadingVerse(verseId), `${id} ${verseId}`);
    for (const language of languages)
      assert.equal(translatedStudy(verseId, language)?.simple, entry.languages[language].simple, `${verseId} ${language}`);
  }
  // Septuagint/Vulgate numbering: the same number elsewhere is another verse.
  assert.match(reader.getReadingVerse('synodal:PSA.99.3').text, /Познайте/);
  assert.equal(translatedStudy('synodal:PSA.100.3', 'ru'), undefined);
  assert.equal(translatedStudy('blivre:PSA.99.3', 'pt'), undefined);
  // English keeps its own study.
  assert.equal(translatedStudy('web:GEN.1.1', 'en'), undefined);
  assert.equal(translatedStudy('synodal:GEN.1.4', 'ru'), undefined);
});

test('related verses exist in the Bibles they name', () => {
  for (const [id, entry] of Object.entries(studies)) for (const echo of entry.echoes) {
    assert.ok(reader.getReadingVerse(`web:${echo.ref}`), `${id} ${echo.ref}`);
    for (const bible of ['dra', 'brenton', 'synodal'])
      if (echo[bible]) assert.ok(reader.getReadingVerse(`${bible}:${echo[bible]}`), `${id} ${bible}:${echo[bible]}`);
  }
});

test('the verse screen falls back to these translations', () => {
  const screen = readFileSync(root + 'mobile/src/app/verse/[id].tsx', 'utf8');
  assert.match(screen, /journalVerseStudy\(journalReference \?\? themeReferenceFor\(id\), lang\) \?\?\s+translatedStudy\(id, lang\)/);
});
