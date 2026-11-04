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
// Execute the native reader's actual TypeScript and lazy JSON loaders without a UI runtime.
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

test('native verse routes retain each collection and do not reuse WEB studies across editions', () => {
  const web = reader.getReadingVerse('web:GEN.1.1');
  const catholic = reader.getReadingVerse('dra:GEN.1.1');
  const orthodox = reader.getReadingVerse('brenton:GEN.1.1');
  assert.equal(web.collection, 'web');
  assert.equal(catholic.collection, 'dra');
  assert.equal(orthodox.collection, 'brenton');
  assert.equal(new Set([web.text, catholic.text, orthodox.text]).size, 3);
  assert.ok(reader.studyFor(web.id));
  assert.equal(reader.studyFor(catholic.id), undefined);
  assert.equal(reader.studyFor(orthodox.id), undefined);
  assert.equal(reader.getReadingVerse('unknown:GEN.1.1'), null);
});

test('native chapter context and citations preserve normalized Nehemiah and supplement provenance', () => {
  const nehemiah = reader.getReadingVerse('brenton:NEH.2.3');
  assert.equal(nehemiah.sourceUrl, 'https://ebible.org/eng-Brenton/EZR12.htm');
  assert.equal(reader.getBook('NEH', 'brenton').chapters['2'].find(v => v.number === '3').text, nehemiah.text);
  const supplement = reader.getReadingVerse('brenton:2ES.16.1');
  assert.equal(supplement.editionName, 'World English Bible Updated');
  assert.equal(supplement.sourceUrl, 'https://ebible.org/engwebu/2ES16.htm');
  const nt = reader.getReadingVerse('brenton:JHN.1.1');
  assert.match(nt.editionName, /World English Bible/);
  assert.equal(nt.sourceUrl, 'https://ebible.org/engwebp/JHN01.htm');
  const note = reader.getReadingVerse('brenton:PRO.30.1');
  assert.equal(note.text, '');
  assert.equal(note.notes.length, 1);
});

test('native collection selection requires an available language and matching tradition and edition', () => {
  assert.equal(reader.collectionFor({scriptureLanguage:'en', tradition:'catholic', edition:'dra'}), 'dra');
  assert.equal(reader.collectionFor({scriptureLanguage:'en', tradition:'orthodox', edition:'brenton'}), 'brenton');
  assert.equal(reader.collectionFor({scriptureLanguage:'en', tradition:'protestant', edition:'web'}), 'web');
  assert.equal(reader.collectionFor({scriptureLanguage:'pt', tradition:'catholic', edition:'dra'}), null);
  assert.equal(reader.collectionFor({scriptureLanguage:'en', tradition:'orthodox', edition:'web'}), null);
});
