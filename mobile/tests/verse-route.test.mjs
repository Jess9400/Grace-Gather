import test from 'node:test';
import assert from 'node:assert/strict';
import { verseRouteId, verseIdFromRoute } from '../src/lib/verse-route.ts';

test('web-safe verse links retain their edition, chapter and verse', () => {
  for (const id of ['brenton:PSA.22.1', 'dra:GEN.1.1', 'synodal:JHN.3.16', 'web:DAG.3.72a']) {
    const route = verseRouteId(id);
    assert.doesNotMatch(route, /[:.]/);
    assert.equal(verseIdFromRoute(route), id);
  }
});

test('existing identifiers and curated links remain readable', () => {
  assert.equal(verseIdFromRoute('dra:GEN.1.1'), 'dra:GEN.1.1');
  assert.equal(verseRouteId('brenton-psalm-22-2'), 'brenton-psalm-22-2');
});
