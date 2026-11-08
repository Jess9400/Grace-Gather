import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FEED } from '../../dist/community-data.js';
const catalog = JSON.parse(await readFile(new URL('../src/generated/catalog.json', import.meta.url), 'utf8'));
test('expanded editorial stories retain distinct previews, translated full guides and sources', () => {
  for (const id of ['harpa', 'malala', 'ruth', 'amazing-grace']) {
    const source = FEED.find(x => x.id === id);
    const native = catalog.FEED.find(x => x.id === id);
    assert.deepEqual(native.body, source.body, `${id}: content sync`);
    for (const lang of ['en', 'pt', 'es', 'ru']) {
      assert.ok(source.body[lang].split(/\s+/).length > 120, `${id}/${lang}: full guide`);
      assert.notEqual(source.summary[lang], source.body[lang]);
      assert.ok(source.body[lang].split('\n\n').length >= 5);
    }
    assert.ok(source.resources.some(([kind, , url]) => ['read', 'study'].includes(kind) && new URL(url).protocol === 'https:'));
    assert.ok(source.resources.some(([kind]) => ['watch', 'listen'].includes(kind)));
  }
});
