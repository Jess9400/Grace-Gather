import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const ts = require('typescript');

// Execute the real handler with disposable, in-memory account and Storage mocks.
function createHandler({failAudioRemoval = false} = {}) {
  const operations = [];
  const files = new Map([
    ['journal-backups', ['backup.bin']],
    ['account-journal-audio', ['recording.bin']],
    ['confession-audio', ['confession-1']],
  ]);
  const service = {
    rpc: async () => ({data: null, error: null}),
    storage: {from: bucket => ({
      list: async () => ({data: files.get(bucket).map(name => ({name})), error: null}),
      remove: async paths => {
        operations.push({action:'remove', bucket, paths});
        if (bucket === 'account-journal-audio' && failAudioRemoval) return {error: Error('storage_failed')};
        files.set(bucket, []);
        return {error:null};
      },
    })},
    from: table => table === 'confessions'
      ? {select: () => ({eq: () => ({not: async () => ({data:[{id:'confession-1'}],error:null})})})}
      : {update: () => ({eq: async () => ({error:null})})},
    auth: {admin: {deleteUser: async id => {operations.push({action:'deleteUser', id}); return {error:null};}}},
  };
  let handler;
  const deps = {
    '../_shared/http.ts': {serve: fn => {handler = fn;}, identity: async () => ({user:{id:'test-user',identities:[]},service}), json:(body,status=200)=>({body,status})},
    '../_shared/apple.ts': {unseal: async x => x, revokeApple: async () => {}},
  };
  const source = readFileSync(new URL('../supabase/functions/account-delete/index.ts',import.meta.url),'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  new Function('require','exports','module',compiled)(name => {if (!deps[name]) throw Error('unexpected dependency'); return deps[name];},exports,{exports});
  return {handler, operations};
}

test('account deletion removes owned audio and backups before deleting the test user', async () => {
  const {handler,operations} = createHandler();
  const response = await handler({method:'POST',json:async()=>({confirm:'DELETE'})});
  assert.equal(response.body.deleted,true);
  assert.deepEqual(operations.map(x => x.action), ['remove','remove','remove','deleteUser']);
  assert.deepEqual(operations.slice(0,3).map(x=>x.bucket), ['journal-backups','account-journal-audio','confession-audio']);
  assert.deepEqual(operations[1].paths, ['test-user/recording.bin']);
});

test('account is not deleted if its audio cannot be removed', async () => {
  const {handler,operations} = createHandler({failAudioRemoval:true});
  await assert.rejects(handler({method:'POST',json:async()=>({confirm:'DELETE'})}), /storage_failed/);
  assert.equal(operations.some(x=>x.action==='deleteUser'),false);
});

test('account deletion requires explicit confirmation', async () => {
  const {handler,operations} = createHandler();
  const response = await handler({method:'POST',json:async()=>({confirm:'no'})});
  assert.equal(response.status,400);
  assert.deepEqual(operations,[]);
});
