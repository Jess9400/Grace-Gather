import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
const source = readFileSync(new URL('../mobile/src/lib/journal-composer.ts', import.meta.url), 'utf8');
const context = createContext({ exports: {} });
runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { shouldSendJournalKey } = context.exports;
test('Enter sends while Shift+Enter keeps a paragraph break', () => {
  assert.equal(shouldSendJournalKey({ key: 'Enter' }), true);
  assert.equal(shouldSendJournalKey({ key: 'Enter', shiftKey: true }), false);
  assert.equal(shouldSendJournalKey({ key: 'a' }), false);
});
test('IME confirmation never submits an unfinished message', () => {
  assert.equal(shouldSendJournalKey({ key: 'Enter', isComposing: true }), false);
  assert.equal(shouldSendJournalKey({ key: 'Enter', keyCode: 229 }), false);
  assert.equal(shouldSendJournalKey({ key: 'Enter', isComposing: false, keyCode: 13 }), true);
});
