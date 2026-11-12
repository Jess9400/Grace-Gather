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
// Execute the app's actual TypeScript and JSON without a UI runtime.
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
const references = load(resolve(root, 'mobile/src/lib/journal-verse-reference.ts'));
const { journalVerseStudy } = load(resolve(root, 'mobile/src/lib/journal-verse-studies.ts'));
await Promise.all(['web', 'dra', 'brenton', 'blivre', 'rv1909', 'synodal'].map(id => reader.ensureCollection(id)));

const map = JSON.parse(readFileSync(root + 'mobile/src/generated/journal-map.json', 'utf8'));
const studies = JSON.parse(readFileSync(root + 'mobile/src/generated/journal-verse-studies.json', 'utf8')).verses;
const catalog = JSON.parse(readFileSync(root + 'mobile/src/generated/catalog.json', 'utf8'));
const themeVerses = [...new Set(map.map(t => t.verse))];
const languages = ['en', 'pt', 'es', 'ru'];
const fields = ['simple', 'context', 'meaning', 'theology', 'today', 'question'];

// The verse a reader of this edition is shown for a theme, as the journal resolves it.
function shownVerse(edition, reference) {
  const prefs = { edition: edition.id, scriptureLanguage: edition.language, tradition: edition.traditions[0] };
  return (Object.hasOwn(reader.collections, edition.id) ? references.journalScripture(edition.id, reference) : null)
    ?? reader.themeVerse(prefs, reference);
}

test('every verse the journal can offer has an explanation, and nothing else is keyed', () => {
  assert.equal(themeVerses.length, 27);
  assert.deepEqual(Object.keys(studies).sort(), [...themeVerses].sort());
});

test('every explanation has every section in English, Portuguese, Spanish and Russian', () => {
  for (const reference of themeVerses) {
    assert.deepEqual(Object.keys(studies[reference]).sort(), [...languages].sort(), reference);
    for (const language of languages) {
      const study = studies[reference][language];
      assert.deepEqual(Object.keys(study).sort(), [...fields].sort(), `${reference} ${language}`);
      for (const field of fields) {
        const where = `${reference} ${language} ${field}`;
        assert.equal(typeof study[field], 'string', where);
        assert.equal(study[field], study[field].trim(), where);
        assert.ok(study[field].length >= 25, where);
        // Each section stays short enough to read on a phone.
        assert.ok(study[field].length <= 520, where);
      }
      assert.match(study.question, /\?$/, `${reference} ${language} question`);
    }
  }
});

test('no section is an untranslated copy of another language', () => {
  for (const reference of themeVerses) for (const field of fields) {
    const texts = languages.map(language => studies[reference][language][field]);
    assert.equal(new Set(texts).size, languages.length, `${reference} ${field}`);
    assert.match(studies[reference].ru[field], /[а-яё]/i, `${reference} ru ${field}`);
    for (const language of ['en', 'pt', 'es'])
      assert.doesNotMatch(studies[reference][language][field], /[а-яё]/i, `${reference} ${language} ${field}`);
  }
});

test('explanations carry no chapter-and-verse citations, links or psalm numbers', () => {
  for (const reference of themeVerses) for (const language of languages) for (const field of fields) {
    const text = studies[reference][language][field], where = `${reference} ${language} ${field}`;
    assert.doesNotMatch(text, /\d\s*[:.,]\s*\d/, where);
    assert.doesNotMatch(text, /http|www\./i, where);
    // Psalm numbers differ between Hebrew-based and Septuagint/Vulgate editions.
    assert.doesNotMatch(text, /(psalm|salmo|псал\S*)\s+\d/i, where);
  }
});

test('explanations do not quote the verse in the wording of any bundled edition', () => {
  const found = new Set();
  const words = text => text.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  for (const reference of themeVerses) for (const edition of catalog.editions) {
    const verse = shownVerse(edition, reference);
    if (!verse) continue;
    const quoted = words(verse.text);
    for (const field of fields) {
      const study = ` ${words(studies[reference][edition.language][field]).join(' ')} `;
      for (let i = 0; i + 4 <= quoted.length; i++) {
        const run = quoted.slice(i, i + 4).join(' ');
        if (study.includes(` ${run} `)) found.add(`${reference} ${edition.id} ${field}: ${run}`);
      }
    }
  }
  // Four consecutive words of a verse, in the reader's own edition, would read as a quotation.
  assert.deepEqual([...found], []);
});

test('the accessor returns the reader’s language and nothing for unknown references', () => {
  for (const language of languages)
    assert.deepEqual(journalVerseStudy("PSA.42.11", language), studies["PSA.42.11"][language]);
  assert.equal(journalVerseStudy(undefined, 'en'), undefined);
  assert.equal(journalVerseStudy('GEN.1.1', 'en'), undefined);
  assert.equal(journalVerseStudy('constructor', 'en'), undefined);
});

test('the verse each edition shows for a theme leads back to that theme’s explanation', () => {
  for (const edition of catalog.editions) for (const reference of themeVerses) {
    const verse = shownVerse(edition, reference);
    // Brenton's Lamentations has no verse numbered 3:22; the journal falls back to a mood passage there.
    if (!verse) { assert.equal(`${edition.id} ${reference}`, 'brenton LAM.3.22'); continue; }
    assert.equal(references.journalStudyReference(verse.id, reference), reference, `${edition.id} ${reference}`);
    // What the verse screen does: an existing English study first, otherwise the journal one.
    for (const language of languages) {
      const study = language === 'en' ? reader.studyFor(verse.id) : undefined;
      const explanation = study ?? journalVerseStudy(references.journalStudyReference(verse.id, reference), language);
      for (const field of fields) assert.ok(explanation?.[field], `${edition.id} ${reference} ${language} ${field}`);
    }
    // The screen can show the verse again from the route alone.
    const location = reader.readingLocation(verse.id);
    const reopened = reader.getReadingVerse(verse.id)
      ?? (location ? references.journalScripture(location.collection, reference) : null);
    assert.equal(reopened?.text, verse.text, `${edition.id} ${reference}`);
  }
});

test('Septuagint and Vulgate numbering still reaches the right explanation', () => {
  assert.equal(references.journalStudyReference('dra:PSA.41.12', 'PSA.42.11'), 'PSA.42.11');
  assert.equal(references.journalStudyReference('synodal:PSA.33.19', 'PSA.34.18'), 'PSA.34.18');
  assert.equal(references.journalStudyReference('brenton:PSA.114.1', 'PSA.116.1'), 'PSA.116.1');
  assert.equal(references.journalStudyReference('figueiredo-salmo-41-12', 'PSA.42.11'), 'PSA.42.11');
  assert.equal(references.journalStudyReference('torresamat-mateo-5-5', 'MAT.5.4'), 'MAT.5.4');
  // The Vulgate prints the mourners as Matthew 5:5; 5:4 there is a different beatitude.
  assert.equal(references.journalVerseId('dra', 'MAT.5.4'), 'dra:MAT.5.5');
  assert.match(reader.getReadingVerse('dra:MAT.5.5').text, /mourn/);
  assert.equal(references.journalStudyReference('dra:MAT.5.4', 'MAT.5.4'), undefined);
});

test('an explanation is never attached to a different verse or to Bible-tab reading', () => {
  // Opened from the Bible tab: no journal reference is passed.
  assert.equal(references.journalStudyReference('web:PSA.42.11', undefined), undefined);
  // The same number in another numbering is a different verse.
  assert.equal(references.journalStudyReference('dra:PSA.42.11', 'PSA.42.11'), undefined);
  assert.equal(references.journalStudyReference('web:PSA.41.12', 'PSA.42.11'), undefined);
  // A mood fallback passage does not borrow the theme's explanation.
  assert.equal(references.journalStudyReference('brenton-psalm-22-2', 'LAM.3.22'), undefined);
  assert.equal(references.journalStudyReference('web:GEN.1.1', 'PSA.42.11'), undefined);
  assert.equal(references.journalStudyReference('web:GEN.1.1', 'not-a-reference'), undefined);
  // Curated passages count only through their explicit study mapping.
  assert.equal(references.journalStudyReference('blivre-mateus-11-28', 'MAT.11.28'), 'MAT.11.28');
  assert.equal(references.journalStudyReference('blivre-mateus-11-28', 'MRK.6.31'), undefined);
});

test('the saved entry passes its theme verse and the verse screen reads it', () => {
  const entry = readFileSync(root + 'mobile/src/app/entry/[id].tsx', 'utf8');
  const verse = readFileSync(root + 'mobile/src/app/verse/[id].tsx', 'utf8');
  assert.match(entry, /journal: journalTheme\(entry\)\.verse/);
  assert.match(verse, /journalStudyReference\(id, journal\)/);
  assert.match(verse, /study \?\? journalVerseStudy\(journalReference, lang\)/);
  // The shipped English studies stay English-only.
  assert.match(verse, /study = lang === "en" \? studyFor\(id\) : undefined/);
  // The note shown with these explanations is translated too.
  const note = 'Editorial reflections are separate from Scripture and await theological review. They are written for this verse and do not represent approval by a church.';
  const translations = JSON.parse(readFileSync(root + 'mobile/src/lib/interface-translations.json', 'utf8'));
  assert.ok(verse.includes(`"${note}"`));
  for (const language of ['pt', 'es', 'ru']) assert.ok(translations[note][language].length > 60, language);
});
