import test from 'node:test';
import assert from 'node:assert/strict';
import { decideRecheck } from '../../supabase/functions/_shared/moderation-recheck-policy.js';
const safe=JSON.stringify({publish:true,uncertain:false,flags:[],summary:'Safe'});
const hold=JSON.stringify({publish:false,uncertain:true,flags:['needs_context'],summary:'Review'});
const job={kind:'confession',source_id:'private-id'};
const snapshot={id:'private-id',author:'private-author',body:'A sample',language:'en'};
function dependencies(overrides={}) {return {candidate:async()=>snapshot,permission:async()=>true,download:async()=>({}),transcribe:async()=> 'A transcript',screen:async()=>safe,...overrides};}
test('recheck sends no identifiers and holds uncertain content',async()=>{
  let payload;
  const d=dependencies({screen:async p=>(payload=p,hold)});
  const result=await decideRecheck(job,d);
  assert.equal(result.outcome,'hold'); assert.equal(payload.id,undefined); assert.equal(payload.author,undefined);
});
test('a revoked permission skips the recheck before data goes to the provider',async()=>{
  let sent=false;const d=dependencies({permission:async()=>false,screen:async()=>{sent=true;return safe;}});
  assert.equal((await decideRecheck(job,d)).outcome,'skip'); assert.equal(sent,false);
});
test('audio requires a usable transcript and failures are retried, never approved',async()=>{
  const audio={...snapshot,audioType:'audio/mp4'};
  assert.equal((await decideRecheck(job,dependencies({candidate:async()=>audio,transcribe:async()=>''}))).outcome,'retry');
  assert.equal((await decideRecheck(job,dependencies({candidate:async()=>audio,screen:async()=>{throw Error('down');}}))).outcome,'retry');
  assert.equal((await decideRecheck(job,dependencies({candidate:async()=>audio}))).outcome,'safe');
});
test('deleted or no-longer-eligible content is skipped',async()=>{
  assert.equal((await decideRecheck(job,dependencies({candidate:async()=>null}))).outcome,'skip');
});
