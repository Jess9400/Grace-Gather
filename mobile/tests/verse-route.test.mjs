import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const ts = createRequire(import.meta.url)('../node_modules/typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(root + 'src/lib/verse-route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
const { toVerseRoute, fromVerseRoute } = module.exports;

test('verse addresses avoid ":" and still open old links', () => {
  assert.equal(toVerseRoute('web:GEN.1.1'), 'web~GEN.1.1');
  assert.doesNotMatch(toVerseRoute('brenton:PSA.22.1'), /:/);
  for (const id of ['web:GEN.1.1', 'dra:PSA.33.19', 'figueiredo-salmo-61-9', 'GEN.1.2'])
    assert.equal(fromVerseRoute(toVerseRoute(id)), id);
  assert.equal(fromVerseRoute('web:GEN.1.1'), 'web:GEN.1.1');
});
