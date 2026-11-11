import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const generated = new URL('../mobile/src/generated/', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, generated), 'utf8'));
const index = key => read(`bible-${key}/index.json`);
const getBook = (key, code) => {
  const metadata = index(key).books.find(book => book.code === code);
  const source = key === 'brenton' && metadata.sourceBaseUrl.includes('/engwebp/') ? 'bible' : `bible-${key}`;
  return read(`${source}/${code}.json`);
};
const verse = (key, code, chapter, number) => getBook(key, code).chapters[String(chapter)].find(v => v.number === String(number));

for (const [key, counts] of [['dra', [73, 1334, 35811]], ['brenton', [81, 1380, 37498]]]) {
  test(`${key} collection has complete verified chapter assets and unique source verse labels`, () => {
    const collection = index(key);
    assert.equal(collection.books.length, counts[0]);
    assert.match(collection.archive_sha256, /^[a-f0-9]{64}$/);
    const ids = new Set();
    let chapters = 0;
    let records = 0;
    const noteOnly = [];
    for (const metadata of collection.books) {
      const book = getBook(key, metadata.code);
      assert.equal(Object.keys(book.chapters).length, metadata.chapters);
      assert.equal(metadata.sourceChapterDigits, metadata.code === 'PSA' ? 3 : 2);
      assert.match(metadata.sourceBaseUrl, /^https:\/\/ebible\.org\//);
      assert.match(metadata.sourceLicenseUrl, /copyright\.htm$/);
      assert.ok(metadata.sourceAttribution);
      let bookRecords = 0;
      for (let c = 1; c <= metadata.chapters; c++) {
        assert.ok(book.chapters[String(c)]?.length, `${key} ${metadata.code}.${c} missing`);
        chapters++;
        for (const v of book.chapters[String(c)]) {
          assert.equal(v.id, `${metadata.code}.${c}.${v.number}`);
          assert.equal(ids.has(v.id), false, `Duplicate ${v.id}`);
          ids.add(v.id);
          assert.ok(Array.isArray(v.notes));
          assert.ok(v.text || v.notes.length, `Unexplained empty verse ${v.id}`);
          assert.doesNotMatch(v.text, /<\/?(?:w|f|ft|v|ve)(?:\s|>)/);
          if (!v.text) noteOnly.push(v.id);
          records++;
          bookRecords++;
        }
      }
      assert.equal(bookRecords, metadata.verses);
    }
    assert.equal(chapters, counts[1]);
    assert.equal(records, counts[2]);
    assert.equal(records, collection.verseCount);
    assert.deepEqual(noteOnly, collection.noteOnlyVerseIds);
    assert.equal(records - noteOnly.length, collection.scriptureVerseCount);
  });
}

test('Brenton Psalms retain numbered headings and opening scripture', () => {
  const psalms = getBook('brenton', 'PSA');
  for (let chapter = 1; chapter <= 151; chapter++) {
    assert.equal(psalms.chapters[String(chapter)][0].number, '1', `Psalm ${chapter}`);
  }
  assert.match(verse('brenton', 'PSA', 22, 1).text, /^The Lord tends me as a shepherd/);
  assert.match(verse('brenton', 'PSA', 26, 1).text, /The Lord is my light/);
  assert.match(verse('brenton', 'PSA', 3, 1).text, /A Psalm of David/);
});

test('Douay-Rheims retains the longer Catholic books and expanded Esther/Daniel/Baruch', () => {
  const books = index('dra').books;
  for (const code of ['TOB', 'JDT', 'WIS', 'SIR', 'BAR', '1MA', '2MA']) assert.ok(books.find(b => b.code === code));
  assert.equal(books.find(b => b.code === 'EST').chapters, 16);
  assert.equal(books.find(b => b.code === 'DAN').chapters, 14);
  assert.equal(books.find(b => b.code === 'BAR').chapters, 6);
  assert.equal(verse('dra', 'GEN', 1, 1).text, 'In the beginning God created heaven, and earth.');
  assert.equal(verse('dra', 'REV', 22, 21).text, 'The grace of our Lord Jesus Christ be with you all. Amen.');
  assert.match(verse('dra', 'DAN', 14, 42).text, /God of Daniel/);
});

test('Brenton longer collection preserves Psalm151 and separately labelled additions', () => {
  const collection = index('brenton');
  assert.equal(collection.isComposite, true);
  assert.equal(collection.oldTestamentBookEntries, 53);
  assert.equal(collection.newTestamentBookEntries, 27);
  assert.equal(collection.supplementBookEntries, 1);
  assert.match(collection.coverageNote, /not a church-approved Orthodox edition/);
  assert.equal(collection.books.find(b => b.code === 'PSA').chapters, 151);
  for (const code of ['ESG', 'DAG', 'TOB', 'JDT', 'WIS', 'SIR', 'BAR', 'LJE', 'SUS', 'BEL', '1MA', '2MA', '1ES', 'MAN', '3MA', '4MA']) {
    assert.ok(collection.books.find(b => b.code === code));
  }
  assert.match(verse('brenton', 'PSA', 151, 7).text, /children of Israel/);
  assert.equal(verse('brenton', 'GEN', 1, 1).text, 'In the beginning God made the heaven and the earth.');
  // Preserve suffixes rather than collapsing different source verses into one.
  assert.ok(verse('brenton', 'ESG', 1, '1b'));
  assert.ok(verse('brenton', 'DAG', 3, '72a'));
});

test('2 Esdras is a source-labelled WEB supplement with all16chapters, not a Brenton translation', () => {
  const metadata = index('brenton').books.find(book => book.code === '2ES');
  assert.equal(metadata.isSupplement, true);
  assert.equal(metadata.chapters, 16);
  assert.equal(metadata.verses, 944);
  assert.equal(metadata.sourceEdition, 'World English Bible Updated');
  assert.equal(metadata.sourceBaseUrl, 'https://ebible.org/engwebu/');
  assert.equal(metadata.sourceBookCode, '2ES');
  assert.match(metadata.coverageNote, /not Brenton/);
  assert.match(verse('brenton', '2ES', 1, 1).text, /^The second book of the prophet Esdras/);
  assert.ok(verse('brenton', '2ES', 16, 78));
  assert.match(index('brenton').supplementSources[0].archive_sha256, /^[a-f0-9]{64}$/);
});

test('publisher notes stay separate from Scripture, including note-only Proverbs30', () => {
  const psalm = verse('brenton', 'PSA', 1, 1);
  assert.match(psalm.text, /evil men\.$/);
  assert.equal(psalm.text.includes('pestilent'), false);
  assert.deepEqual(psalm.notes, ['Gr. pestilent.']);
  const note = verse('brenton', 'PRO', 30, 1);
  assert.equal(note.text, '');
  assert.deepEqual(note.notes, ['See chapter 24 for the content of chapter 30.']);
});

test('Nehemiah consistently uses the combined publisher source and accurate source offset', () => {
  const metadata = index('brenton').books.find(b => b.code === 'NEH');
  assert.equal(metadata.sourceBookCode, 'EZR');
  assert.equal(metadata.sourceChapterOffset, 10);
  assert.equal(getBook('brenton', 'EZR').book.chapters, 10);
  assert.equal(getBook('brenton', 'NEH').book.chapters, 13);
  assert.match(verse('brenton', 'NEH', 2, 3).text, /countenance be sad/);
  assert.equal(verse('brenton', 'NEH', 3, '6a').text.includes('Maltias'), true);
});

test('composite New Testament reuses the exact existing WEB assets without retranslation', () => {
  const collection = index('brenton');
  const nt = collection.books.filter(book => book.sourceBaseUrl === 'https://ebible.org/engwebp/');
  assert.equal(nt.length, 27);
  assert.equal(nt[0].code, 'MAT');
  assert.equal(nt.at(-1).code, 'REV');
  for (const metadata of nt) {
    assert.equal(metadata.sourceEdition, 'World English Bible, Protestant Edition');
    assert.deepEqual(getBook('brenton', metadata.code), read(`bible/${metadata.code}.json`));
  }
});

test('each generated loader covers every indexed book exactly once', () => {
  for (const key of ['dra', 'brenton']) {
    const loaders = readFileSync(new URL(`bible-${key}/loaders.ts`, generated), 'utf8');
    const codes = [...loaders.matchAll(/"([A-Z0-9]{3})":\(\)=>require/g)].map(match => match[1]);
    assert.deepEqual(codes, index(key).books.map(book => book.code));
  }
});

test('reviewed first and last source records retain edition-specific wording', () => {
  assert.notEqual(verse('dra', 'JHN', 15, 9).text, verse('brenton', 'JHN', 15, 9).text);
  const text = verse('dra', 'JHN', 15, 9).text;
  // A transcription is preserved as supplied, not silently corrected to a quotation elsewhere.
  assert.equal(text, 'As the Father hath loved me, I also have loved you.');
  assert.equal(verse('brenton', 'REV', 22, 21).text, 'The grace of the Lord Jesus Christ be with all the saints. Amen.');
});
