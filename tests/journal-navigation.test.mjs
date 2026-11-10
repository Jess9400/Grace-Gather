import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
import { createContext, runInContext } from 'node:vm';
const source = readFileSync(new URL('../mobile/src/lib/journal-navigation.ts', import.meta.url), 'utf8');
const ctx = createContext({ exports: {} });
runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, ctx);
test('Confession return uses only an existing entry ID and preserves listener destination', () => {
 const share = ctx.exports.confessionJournalTarget('entry-123', 'A04');
 assert.equal(share.pathname, '/(tabs)/confession');
 assert.equal(share.params.returnEntry, 'entry-123');
 assert.equal(share.params.view, undefined);
 assert.equal(ctx.exports.confessionJournalTarget('entry-123', 'A14').params.view, 'comfort');
 assert.equal(ctx.exports.journalReturnId('entry-123', [{id:'entry-123'}]), 'entry-123');
 assert.equal(ctx.exports.journalReturnId('other', [{id:'entry-123'}]), undefined);
 assert.equal(ctx.exports.journalReturnId(undefined, [{id:'entry-123'}]), undefined);
});
