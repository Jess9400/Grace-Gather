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
await Promise.all(['blivre','rv1909','synodal'].map(id => reader.ensureCollection(id)));

test('Community maps curated quotations only through explicit edition-specific verse aliases', () => {
  assert.equal(reader.discussionVerseId('brenton-psalm-22-2'),'brenton:PSA.22.2');
  assert.equal(reader.discussionVerseId('web:GEN.1.27'),'web:GEN.1.27');
  assert.equal(reader.discussionVerseId('brenton:PSA.22.2'),'brenton:PSA.22.2');
  assert.equal(reader.discussionVerseId('web:PSA.22.2'),'web:PSA.22.2');
  assert.equal(reader.discussionVerseId('web:GEN.999.1'),null);
  assert.equal(reader.discussionVerseId('unmapped-curated-verse'),null);
});

test('native verse routes retain their collection and require explicit study mappings', () => {
  const web = reader.getReadingVerse('web:GEN.1.1');
  const catholic = reader.getReadingVerse('dra:GEN.1.1');
  const orthodox = reader.getReadingVerse('brenton:GEN.1.1');
  assert.equal(web.collection, 'web');
  assert.equal(catholic.collection, 'dra');
  assert.equal(orthodox.collection, 'brenton');
  assert.equal(new Set([web.text, catholic.text, orthodox.text]).size, 3);
  assert.ok(reader.studyFor(web.id));
  assert.ok(reader.studyFor(catholic.id));
  assert.equal(reader.studyFor('dra:GEN.1.4'),undefined);
  assert.ok(reader.studyFor(orthodox.id));
  assert.equal(reader.studyFor('brenton:GEN.1.4'),undefined);
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

test('every English diary reply has a full reflection and correct chapter in its own edition', () => {
  const catalog = load(resolve(root,'mobile/src/generated/catalog.json'));
  for (const edition of catalog.editions.filter(e=>['web','dra','brenton'].includes(e.id))) {
    for (const passage of edition.passages) {
      const study=reader.studyFor(passage.id);
      assert.ok(study, passage.id);
      for(const field of ['simple','context','meaning','today','theology','question']) assert.ok(study[field]?.length>35, passage.id+':'+field);
      const location=reader.readingLocation(passage.id);
      assert.equal(location.collection,edition.id);
      assert.ok(reader.getBook(location.code,location.collection).chapters[String(location.chapter)],passage.id);
      assert.equal(reader.getReadingVerse(passage.id).text,passage.text);
    }
  }
  assert.equal(reader.studyFor('dra:PSA.22.2'),undefined);
  assert.ok(reader.studyFor('brenton:PSA.22.2'));
});

test('the tradition question requires a recorded answer or explicit skip, including after migration', () => {
  const {hasAnsweredTraditionQuestion:answered}=load(resolve(root,'mobile/src/lib/onboarding.ts'));
  assert.equal(answered({onboarded:true,tradition:'orthodox',faithChoice:'orthodox'}),false);
  assert.equal(answered({onboarded:true,faithChoice:'unspecified',traditionQuestionVersion:1}),true);
  assert.equal(answered({onboarded:true,faithChoice:'exploring',traditionQuestionVersion:1}),true);
  assert.equal(answered({onboarded:false,faithChoice:'orthodox',traditionQuestionVersion:1}),false);
  assert.equal(answered({onboarded:true,traditionQuestionVersion:1}),false);
  assert.equal(answered({onboarded:true,faithChoice:'catholic',traditionQuestionVersion:1}),true);
});

test('all restored study sections reproduce from the shared authored source', () => {
  assert.equal(readFileSync(resolve(root,'shared/quiet-studies.json'),'utf8'),readFileSync(resolve(root,'mobile/src/generated/quiet-studies.json'),'utf8'));
});

test('faith reading follows the actual chosen tradition and keeps general wellbeing separate', () => {
 const {readingBooks,bookPerspective}=load(resolve(root,'mobile/src/lib/reading-resources.ts'));
 for (const [tradition,expected] of [['orthodox','orthodox-way'],['catholic','return'],['protestant','grief']]) {
  const selection=readingBooks({faithChoice:tradition,language:'en'});
  assert.equal(selection.faith.length,1);
  assert.equal(selection.faith[0].id,expected);
  assert.equal(selection.general.length,4);
  for(const book of selection.faith) assert.ok(bookPerspective(book.id).traditions.includes(tradition));
  assert.equal(selection.unclassified.length,0);
 }
 assert.equal(readingBooks({faithChoice:'orthodox',language:'en'},true).faith.length,3);
 assert.equal(readingBooks({faithChoice:'exploring',language:'en'}).faith.length,3);
 assert.equal(readingBooks({faithChoice:'unspecified',language:'en'}).faith.length,3);
 assert.equal(bookPerspective('unknown-book').kind,'unclassified');
});

test('resource labels retain their publisher or author sources and reproduce from authored data', () => {
 const {bookPerspective}=load(resolve(root,'mobile/src/lib/reading-resources.ts'));
 assert.equal(bookPerspective('orthodox-way').sourceUrl,'https://svspress.com/the-orthodox-way-classics-series-vol-2/');
 assert.equal(bookPerspective('grief').perspective.en,'Anglican author');
 assert.equal(bookPerspective('return').perspective.en,'Catholic author');
 assert.equal(readFileSync(resolve(root,'shared/reading-resources.json'),'utf8'),readFileSync(resolve(root,'mobile/src/generated/reading-resources.json'),'utf8'));
});

test('full readers follow Scripture language independently of interface language', () => {
 const catalog=load(resolve(root,'mobile/src/generated/catalog.json'));
 for(const [id,language] of [['blivre','pt'],['rv1909','es'],['synodal','ru']]) {
  const edition=catalog.editions.find(e=>e.id===id);
  for(const ui of ['en','pt','es','ru'])for(const tradition of edition.traditions){
   assert.equal(reader.collectionFor({language:ui,scriptureLanguage:language,tradition,edition:id}),id);
   assert.equal(reader.collectionFor({language:language,scriptureLanguage:'en',tradition,edition:id}),null);
  }
  assert.equal(reader.collections[id].index.books.length,66);
  for(const passage of edition.passages){
   const location=reader.readingLocation(passage.id);
   assert.equal(location.collection,id);
   assert.equal(reader.getReadingVerse(passage.id).text,passage.text);
   const number=passage.reference.match(/:(\d+)/)[1];
   const full=reader.getReadingVerse(`${id}:${location.code}.${location.chapter}.${number}`);
   assert.equal(full.text,passage.text.replace(/\s+/g,' ').trim(),passage.id);
   assert.equal(full.collection,id);
   assert.ok(full.attribution && full.licenseUrl);
  }
 }
 for(const scriptureLanguage of ['pt','es','ru'])assert.equal(reader.collectionFor({scriptureLanguage,tradition:'catholic',edition:'dra'}),null);
 assert.match(reader.getReadingVerse('blivre:GEN.1.1').text,/princípio/);
 assert.match(reader.getReadingVerse('rv1909:GEN.1.1').text,/principio/);
 assert.match(reader.getReadingVerse('synodal:GEN.1.1').text,/начале/);
 assert.equal(reader.getReadingVerse('rv1909:NUM.12.16').text,'');
 assert.ok(reader.getReadingVerse('rv1909:NUM.12.16').notes.length);
});

test('study topic references resolve in all six supported Bible editions', () => {
  for (const edition of ['web','dra','brenton','blivre','rv1909','synodal']) {
    for (const reference of ['EPH.2.8','MAT.6.14','JAS.1.5','ROM.15.13','JHN.14.27','MAT.11.28','JHN.15.9','1TH.5.18']) {
      const verse = reader.getReadingVerse(`${edition}:${reference}`);
      assert.ok(verse?.text, `${edition}:${reference}`);
      assert.equal(verse.collection,edition);
    }
  }
});

test('passage-only Catholic Bibles give the journal their own wording of each theme verse', () => {
  const prefs = (edition, scriptureLanguage) => ({ edition, scriptureLanguage, tradition: 'catholic' });
  const guilt = reader.themeVerse(prefs('figueiredo', 'pt'), '1JN.1.9');
  assert.equal(guilt.reference, '1 João 1:9');
  assert.match(guilt.text, /confessarmos os nossos peccados/);
  assert.equal(guilt.editionName, 'Figueiredo · 1866');
  assert.match(guilt.sourceUrl, /archive\.org/);
  // Vulgate numbering: Hebrew Psalm 42:11 is Psalm 41:12 in Torres Amat.
  const sad = reader.themeVerse(prefs('torresamat', 'es'), 'PSA.42.11');
  assert.equal(sad.reference, 'Salmo 41:12 (Torres Amat)');
  // Themes whose verse was already a curated passage reuse it, with its context.
  const rest = reader.themeVerse(prefs('torresamat', 'es'), 'MAT.11.28');
  assert.equal(rest.id, 'torresamat-mateo-11-28');
  assert.ok(rest.context);
  // The verse screen opens these by id.
  assert.equal(reader.getReadingVerse(guilt.id).text, guilt.text);
  // Only the reader's own edition and tradition.
  assert.equal(reader.themeVerse({ ...prefs('figueiredo', 'pt'), tradition: 'protestant' }, '1JN.1.9'), null);
  assert.equal(reader.themeVerse(prefs('torresamat', 'es'), 'GEN.1.1'), null);
});

test('every Orthodox psalm keeps its first verse, title included, as the publisher numbers it', () => {
  const psalms = JSON.parse(readFileSync(resolve(root, 'mobile/src/generated/bible-brenton/PSA.json'), 'utf8')).chapters;
  for (const [chapter, verses] of Object.entries(psalms)) {
    // Psalms 115 and 144 keep the publisher's own labels (such as 4a) later on.
    assert.equal(verses[0].number, '1', `Brenton Psalm ${chapter}`);
  }
  assert.match(psalms['22'][0].text, /The Lord tends me as a shepherd, and I shall want nothing\./);
  assert.match(psalms['26'][0].text, /The Lord is my light/);
  const habakkuk = JSON.parse(readFileSync(resolve(root, 'mobile/src/generated/bible-brenton/HAB.json'), 'utf8')).chapters;
  assert.match(habakkuk['3'][0].text, /^A Prayer of the Prophet Ambacum/);
});
