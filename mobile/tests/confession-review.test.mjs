import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { confessionService } from '../../supabase/functions/_shared/confession-service.js';

const ts = createRequire(import.meta.url)('typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/confession-review.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
const { confessionReviewNote } = module.exports;

test('approvals can use an automatic audit note; rejections require a reason', () => {
  assert.equal(confessionReviewNote('approved', ''), 'Reviewed and approved.');
  assert.equal(confessionReviewNote('approved', '  Kind response  '), 'Kind response');
  assert.equal(confessionReviewNote('approved', 'ok'), null);
  assert.equal(confessionReviewNote('rejected', ''), null);
  assert.equal(confessionReviewNote('rejected', 'Unsafe advice'), 'Unsafe advice');
  assert.equal(confessionReviewNote('approved', 'x'.repeat(501)), null);
});

test('moderators cannot approve their own content', async () => {
  const store = { get: async () => ({ id: 'x', author: 'staff', kind: 'confession', status: 'pending' }) };
  await assert.rejects(confessionService({ store, user: 'staff', moderator: true }, 'moderate', { id: 'x', decision: 'approved', note: 'Reviewed and approved.' }), e => e.message === 'self_review');
});
