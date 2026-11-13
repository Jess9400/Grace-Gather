import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/lib/burden-copy.ts', import.meta.url), 'utf8');
const module = { exports: {} };
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  module, exports: module.exports, require: () => ({ copy: (language, key) => `${language}:${key}` }),
});

test('Protestant room wording is localized and other traditions keep existing copy', () => {
  const { roomCopy } = module.exports;
  assert.equal(roomCopy('en', 'confession', true), 'Share a burden');
  assert.equal(roomCopy('en', 'cMine', true), 'My burdens & comfort');
  for (const language of ['en', 'pt', 'es', 'ru']) {
    assert.notEqual(roomCopy(language, 'cShare', true), `${language}:cShare`);
    assert.equal(roomCopy(language, 'cShare', false), `${language}:cShare`);
  }
});
