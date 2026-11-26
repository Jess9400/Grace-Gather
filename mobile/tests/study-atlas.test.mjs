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
const context = load(new URL('study-context.ts', root));
test('all regions bundle localized, reasonably sized map images', () => {
  for (const region of ['levant','east','mediterranean']) for (const language of ['en','pt','es','ru']) {
    const bytes=readFileSync(new URL(`../assets/study-maps/${region}-${language}.png`,import.meta.url));
    assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),region==='levant'?1050:1500);
    assert.equal(bytes.readUInt32BE(20),region==='levant'?1200:1100);
    assert.ok(bytes.length<250000,'maps remain small enough to bundle');
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
test('the in-app map viewer uses bundled images without a graphics context or tile service', () => {
  const source=readFileSync(new URL('../src/components/BibleAtlas.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/expo-gl|GLView|WebGL|createAtlasRenderer/);
  assert.match(source,/source=\{atlasImages\[region\]\[language\]\}/);
  const images=readFileSync(new URL('../src/lib/study-atlas.ts',import.meta.url),'utf8');
  assert.equal((images.match(/require\(/g)||[]).length,12);
});
