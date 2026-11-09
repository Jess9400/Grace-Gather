import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(readFileSync(root + 'mobile/src/generated/catalog.json', 'utf8'));
const source = JSON.parse(readFileSync(root + 'dist/scripture.json', 'utf8'));
const backend = JSON.parse(readFileSync(root + 'supabase/functions/_shared/journey-catalog.json', 'utf8'));
const { PSALM23 } = await import(root + 'dist/psalms.js');

const editions = { figueiredo: 'pt', torresamat: 'es' };

test('Portuguese and Spanish Catholic readers have their own Catholic edition', () => {
  for (const [id, language] of Object.entries(editions)) {
    const matches = catalog.editions.filter(
      (e) => e.language === language && e.traditions.includes('catholic'),
    );
    assert.deepEqual(matches.map((e) => e.id), [id]);
    // Only Catholic: never offered as a Protestant or Orthodox text.
    assert.deepEqual(matches[0].traditions, ['catholic']);
  }
});

test('the new editions carry the same six themes as the English Catholic edition, with sources', () => {
  const dra = catalog.editions.find((e) => e.id === 'dra');
  for (const id of Object.keys(editions)) {
    const edition = catalog.editions.find((e) => e.id === id);
    assert.equal(edition.license, 'Public domain');
    assert.ok(edition.attribution.length > 80 && edition.licenseUrl && edition.sourceUrl);
    assert.deepEqual(edition.passages.map((p) => p.theme), dra.passages.map((p) => p.theme));
    for (const [i, passage] of edition.passages.entries()) {
      assert.match(passage.id, new RegExp('^' + id + '-'));
      assert.match(passage.sourceUrl, /^https:\/\/archive\.org\/details\/.+\/page\/n\d+\/mode\/1up$/);
      assert.ok(passage.text.length > 20, passage.id);
      assert.deepEqual(passage.context, dra.passages[i].context);
      assert.deepEqual(passage.situations, dra.passages[i].situations);
    }
    assert.equal(PSALM23[id].verses.length, 6);
    assert.deepEqual(catalog.PSALM23[id], PSALM23[id]);
  }
});

test('app and backend catalogs match the authored scripture source', () => {
  assert.deepEqual(catalog.editions, source.editions);
  assert.deepEqual(backend.editions, source.editions);
});

test('original spelling is kept, not modernised', () => {
  const text = (id) => catalog.editions.find((e) => e.id === id).passages.map((p) => p.text).join(' ');
  assert.match(text('figueiredo'), /alliviarei/);
  assert.match(text('figueiredo'), /\bDeos\b/);
  assert.match(text('torresamat'), /Venid á mí/);
  assert.match(text('torresamat'), /corazon/);
});
