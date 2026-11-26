import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(url) {
  if (url.pathname.endsWith('.json')) return JSON.parse(readFileSync(url, 'utf8'));
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    module, exports: module.exports,
    require: path => load(new URL(path.endsWith('.json') ? path : path + '.ts', url)),
  });
  return module.exports;
}
const root = new URL('../src/lib/', import.meta.url);
const atlas = load(new URL('study-atlas.ts', root));
const context = load(new URL('study-context.ts', root));
test('bundled atlas grids contain finite elevation and matching land masks', async () => {
  for (const region of ['levant','east','mediterranean']) {
    const t = await atlas.loadTerrain(region);
    assert.equal(t.heights.length, t.size * t.size);
    assert.equal(t.land.length, t.heights.length);
    assert.ok(t.heights.every(Number.isFinite));
    assert.ok(t.land.every(v => v === 0 || v === 1));
    assert.ok(t.heights.some(v => v > 1000));
    const places = await atlas.loadAtlasPlaces('MRK', t);
    assert.ok(places.length > 0);
    for (const p of places) {
      assert.ok(p.lon >= t.bounds[0] && p.lon <= t.bounds[2]);
      assert.ok(p.lat >= t.bounds[1] && p.lat <= t.bounds[3]);
      const projection = atlas.atlasPlaceProjection(t, p, 2, {yaw:.3,zoom:1.5,tilt:.3});
      assert.ok(projection && Number.isFinite(projection.x) && Number.isFinite(projection.y));
    }
    assert.ok(places.some(p => p.uncertain));
  }
});
test('context selects narrative settings without claiming a date for unknown books', () => {
  assert.equal(context.historicalContext('dra:MRK.2.1').region,'levant');
  assert.equal(context.historicalContext('web:ACT.2.1').region,'mediterranean');
  assert.ok(context.historicalContext('web:ISA.39.1').modules.includes('kingdoms'));
  assert.ok(context.historicalContext('web:ISA.40.1').modules.includes('exile'));
  assert.ok(context.historicalContext('web:EXO.1.1').period[0].includes('disputed'));
  assert.equal(context.historicalContext('web:GEN.1.1').modules.length,0);
});
test('web context attributes stay stable across camera and layout updates', () => {
  const source = readFileSync(new URL('../src/components/BibleAtlas.tsx',import.meta.url),'utf8');
  assert.match(source,/webglContextAttributes: WEB_CONTEXT_ATTRIBUTES/);
  assert.match(source,/if \(ctx.current !== gl\) releaseContext\(ctx.current\)/);
});
