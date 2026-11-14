import test from 'node:test';
import assert from 'node:assert/strict';
import { confessionService } from '../../supabase/functions/_shared/confession-service.js';

test('a listener can block an anonymous confession author without exposing identity', async () => {
  const row = { id:'case-1', kind:'confession', author:'writer', status:'approved', closed:false, claimed_by:'listener', claimed_until:Date.now()+60000 };
  const blocks = [];
  const store = {
    get: async id => id === row.id ? row : null,
    replyFor: async () => null,
    blocked: async (actor,target) => blocks.some(pair => pair[0] === actor && pair[1] === target),
    block: async (actor,target) => blocks.push([actor,target]),
  };
  const result = await confessionService({store,user:'listener'},'block',{id:row.id});
  assert.deepEqual(result, {ok:true});
  assert.deepEqual(blocks, [['listener','writer']]);
  await assert.rejects(confessionService({store,user:'listener'},'open',{id:row.id}), e => e.message === 'not_available' && e.status === 409);
});
test('a stranger cannot block via an unreserved confession', async () => {
  const row = {id:'case-1',kind:'confession',author:'writer',status:'approved',closed:false,claimed_by:'listener',claimed_until:Date.now()+60000};
  let blocked = false;
  const store = {get:async()=>row,replyFor:async()=>null,blocked:async()=>false,block:async()=>{blocked=true;}};
  await assert.rejects(confessionService({store,user:'stranger'},'block',{id:row.id}), e => e.message === 'not_found' && e.status === 404);
  assert.equal(blocked,false);
});
