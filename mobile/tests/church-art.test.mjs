import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/lib/church-art.ts', import.meta.url), 'utf8');
const module = { exports: {} };
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
const { artworkBox, artworkFrame, artworkPlaceAt, artworkPoints, artworkStage } = module.exports;

test('the three sanctuary artworks cover phone and wide screens without empty edges', () => {
  for (const [width, height] of [[390, 844], [430, 932], [900, 700]]) {
    const frame = artworkFrame(width, height);
    const stage = artworkStage(width, height);
    assert.ok(frame.left <= stage.left && frame.top <= 0);
    assert.ok(frame.left + frame.width >= stage.left + stage.width && frame.top + frame.height >= height);
    for (const art of ['catholic', 'orthodox', 'protestant']) {
      const points = artworkPoints(art, width, height);
      for (const place of ['candles', 'confession', 'bible', 'gather', 'pews', 'pray', 'wreath', 'window', 'altar']) {
        assert.ok(Number.isFinite(points[place].x) && Number.isFinite(points[place].y), `${art}: ${place}`);
      }
    }
  }
});
test('tapping the illustrated targets chooses the correct available place', () => {
  for (const art of ['catholic', 'orthodox', 'protestant']) {
    const places = art === 'orthodox' ? ['candles', 'confession', 'pray'] : ['candles', 'confession', 'bible', 'gather', 'pews'];
    for (const place of places) {
      const box = artworkBox(art, place, 390, 844);
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      assert.equal(artworkPlaceAt(art, 390, 844, x, y, places), place, `${art}: ${place}`);
    }
    assert.equal(artworkPlaceAt(art, 0, 844, 20, 20, places), null);
    assert.equal(artworkPlaceAt(art, 390, 844, NaN, 20, places), null);
  }
});
