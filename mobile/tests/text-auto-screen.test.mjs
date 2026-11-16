import test from 'node:test';
import assert from 'node:assert/strict';
import { autoScreenText } from '../../supabase/functions/_shared/text-auto-screen.js';
const safe=JSON.stringify({publish:true,uncertain:false,flags:[],summary:'Clear'});
test('automatically screens approved kinds without sending internal identifiers',async()=>{
  let sent, approved;
  const candidate={id:'private-id',item:'private-parent',created:'time',body:'Thank you for sharing.',displayName:'Grace'};
  const result=await autoScreenText('comment',candidate,{screen:async input=>(sent=input,safe),approve:async input=>(approved=input,true)});
  assert.equal(result,'approved'); assert.equal(approved,candidate); assert.equal(sent.id,undefined); assert.equal(sent.item,undefined); assert.equal(sent.created,undefined);
});
test('links, uncertainty, risky content, failures and stale data stay pending',async()=>{
  let calls=0; const deps={screen:async()=>{calls++;return safe;},approve:async()=>true};
  assert.equal(await autoScreenText('giving',{body:'Help people',website:'https://example.com'},deps),'pending');
  assert.equal(await autoScreenText('comment',{body:'contact me@example.com'},deps),'pending'); assert.equal(calls,0);
  assert.equal(await autoScreenText('comment',{body:'Thank you'},{screen:async()=>'{',approve:async()=>true}),'pending');
  assert.equal(await autoScreenText('comment',{body:'Thank you'},{screen:async()=>safe,approve:async()=>false}),'pending');
  assert.equal(await autoScreenText('bad',{body:'Thank you'},deps),'pending');
});
test('text screening marks safety concerns for review without publishing',async()=>{
  let marked;
  const candidate={id:'private',body:'I want to hurt myself'};
  assert.equal(await autoScreenText('testimony',candidate,{flag:async c=>{marked=c;},screen:async()=>safe,approve:async()=>true}),'pending');
  assert.equal(marked,candidate);
  marked=null;
  const decision=JSON.stringify({publish:false,uncertain:false,flags:['threat'],summary:'Needs human review'});
  assert.equal(await autoScreenText('comment',{id:'x',body:'ordinary text'},{flag:async c=>{marked=c;},screen:async()=>decision,approve:async()=>true}),'pending');
  assert.equal(marked.id,'x');
});
