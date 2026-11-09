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
const aiCopy = compile('../mobile/src/lib/ai-copy.ts');
const content = compile('../mobile/src/lib/content.ts', (id) => {
  if (id === './ai-copy') return aiCopy;
  if (id === '../generated/catalog.json') return JSON.parse(readFileSync(new URL('../mobile/src/generated/catalog.json', import.meta.url)));
  throw Error(id);
});
const { currentJournalAction, JOURNAL_MESSAGE_LIMIT } = compile('../mobile/src/lib/journal-chat.ts', () => content);
const suggested = { id: 'one', role: 'assistant', content: 'Try a hopeful story.', actionId: 'A19' };
const listening = { id: 'two', role: 'assistant', content: 'What was that like for you?' };

test('the latest action stays available through replies that only listen', () => {
  assert.equal(currentJournalAction([], 'A08').actionId, 'A08');
  const result = currentJournalAction([suggested, listening], 'A08');
  assert.equal(result.actionId, 'A19');
  assert.equal(result.messageId, 'one');
});
test('a new recommendation replaces the pinned action without deleting history', () => {
  const history = [suggested, listening, { ...suggested, id: 'three', actionId: 'A02' }];
  const result = currentJournalAction(history, 'A08');
  assert.equal(result.actionId, 'A02');
  assert.equal(result.messageId, 'three');
  assert.equal(history[0].actionId, 'A19');
  assert.equal(history.length, 3);
});
test('support replies and urgent pending messages suppress ordinary pinned actions', () => {
  assert.equal(currentJournalAction([suggested, { ...listening, support: true }, listening], 'A08'), null);
  assert.equal(currentJournalAction([suggested, { id: 'urgent', role: 'user', content: 'I want to kill myself' }], 'A08'), null);
});
test('the existing bounded conversation allowance remains twenty exchanges', () => {
  assert.equal(JOURNAL_MESSAGE_LIMIT, 40);
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
