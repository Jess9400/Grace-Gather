import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';

const compile = (path, require) => {
  const context = createContext({ exports: {}, require });
  runInContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
};
const { partitionJournalMessages, JOURNAL_MESSAGE_LIMIT } = compile('../mobile/src/lib/journal-chat.ts');
test('short conversations stay inline without trimming action buttons or message content', () => {
  const messages = [{id:'one',role:'user',content:'A thought'}, {id:'two',role:'assistant',content:'A reply',actionId:'A08'}];
  const view = partitionJournalMessages(messages);
  assert.equal(view.older.length,0);assert.equal(view.recent,messages);
  assert.equal(view.recent[1].actionId,'A08');
});
test('long conversations fold earlier exchanges without splitting a user/reply pair', () => {
  const history = Array.from({length:21},(_,i)=>({id:String(i),role:i%2?'assistant':'user',content:'A message'}));
  const view = partitionJournalMessages(history);
  assert.equal(view.older.length,18);assert.equal(view.recent.length,3);
  assert.equal(view.recent[0].role,'user');
  assert.deepEqual([...view.older,...view.recent],history);
});
test('the existing bounded conversation allowance remains twenty exchanges', () => {
  assert.equal(JOURNAL_MESSAGE_LIMIT,40);
});

const requireMobile = createRequire(new URL('../mobile/package.json', import.meta.url));
const { FunctionsHttpError } = requireMobile('@supabase/supabase-js');
const { aiRequestError } = compile('../mobile/src/lib/ai-error.ts', () => ({ FunctionsHttpError }));
const httpError = (body, status) => new FunctionsHttpError(new Response(JSON.stringify(body), { status }));
test('rate limits, busy responses and authentication have distinct recoverable errors', async () => {
  assert.equal((await aiRequestError(httpError({ error: 'rate_limited' }, 429))).message, 'rate_limited');
  assert.equal((await aiRequestError(httpError({ error: 'provider_busy' }, 503))).message, 'provider_busy');
  assert.equal((await aiRequestError(httpError({ error: 'unauthorized' }, 401))).message, 'Sign in to continue');
});
test('unknown or malformed provider failures never expose their response contents', async () => {
  assert.equal((await aiRequestError(httpError({ error: 'private provider details' }, 500))).message, 'ai_unavailable');
  assert.equal((await aiRequestError(new FunctionsHttpError(new Response('not JSON', { status: 500 })))).message, 'ai_unavailable');
  assert.equal((await aiRequestError(new Error('private request data'))).message, 'ai_unavailable');
});
