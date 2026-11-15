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
const { artworkBox, artworkFrame, artworkPlaceAt, artworkPoints, artworkStage, artworkHasTourTarget, visibleArtworkTourPoint } = module.exports;

test('important tour arrows stay on the visible part of the right objects', () => {
  const targets = [
    ['catholic', 'pews'], ['protestant', 'pews'], ['protestant', 'confession'],
    ['orthodox', 'pews'], ['orthodox', 'gather'], ['orthodox', 'confession'], ['orthodox', 'bible'],
  ];
  for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932], [825, 675], [1024, 768]]) {
    for (const [art, place] of targets) {
      const point = visibleArtworkTourPoint(art, place, width, height, 64);
      const box = artworkBox(art, place, width, height);
      assert.ok(point, `${art} ${place} at ${width}x${height}`);
      assert.ok(point.x >= box.left && point.x <= box.left + box.width);
      assert.ok(point.y >= box.top && point.y <= box.top + box.height);
      assert.ok(point.x >= 24 && point.x <= width - 24 && point.y >= 66 && point.y <= height - 76);
      const captionWidth = Math.min(420, (width - 56) * .62);
      if (place === 'pews') assert.ok(point.x - 24 > (width + captionWidth) / 2, 'right-bench arrow clears the centered caption');
      if (art === 'orthodox' && place === 'gather') assert.ok(point.x + 24 < (width - captionWidth) / 2, 'left-bench arrow clears the centered caption');
    }
  }
  assert.equal(visibleArtworkTourPoint('protestant', 'candles', 390, 844, 64), null);
});

test('the tour does not point at invented objects in the artwork', () => {
  assert.equal(artworkHasTourTarget('orthodox', 'confession'), true);
  assert.equal(artworkHasTourTarget('protestant', 'confession'), true);
  assert.equal(artworkHasTourTarget('protestant', 'candles'), false);
  assert.equal(artworkHasTourTarget('catholic', 'confession'), true);
  assert.equal(artworkHasTourTarget('orthodox', 'candles'), true);
  assert.equal(artworkHasTourTarget('protestant', 'bible'), true);
});

test('the single journal and quiet stop points to the right bench in every church', () => {
  const protestant = artworkPoints('protestant', 869, 1810);
  assert.ok(protestant.confession.x / 869 < 0.2);
  for (const art of ['catholic', 'orthodox', 'protestant']) {
    assert.ok(artworkPoints(art, 869, 1810).pews.x / 869 > 0.65, art);
    for (const [width, height] of [[320, 568], [375, 812], [390, 844], [430, 932]]) {
      const point = artworkPoints(art, width, height).pews;
      assert.ok(point.x >= 24 && point.x <= width - 24 && point.y >= 66 && point.y <= height - 24, `${art}: ${width}x${height}`);
    }
  }
});

test('Orthodox tour points to the central doors and the lectern', () => {
  const points = artworkPoints('orthodox', 869, 1810);
  assert.ok(Math.abs(points.confession.x / 869 - 0.495) < 0.01);
  assert.ok(points.bible.x / 869 > 0.8);
  assert.ok(points.gather.x / 869 < 0.3);
});

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
