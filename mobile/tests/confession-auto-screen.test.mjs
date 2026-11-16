import test from 'node:test';
import assert from 'node:assert/strict';
import { autoScreenConfession } from '../../supabase/functions/_shared/confession-auto-screen.js';

const input = { id:'one', author:'member', created:123, kind:'confession', body:'I am feeling lonely today.', language:'en', audio:null, itemConsent:true, audioConsent:false };
const safe = JSON.stringify({publish:true,uncertain:false,flags:[],summary:'No concerns.'});
function deps(overrides={}) {
  const calls=[];
  return {calls, permission:async()=>true, transcribe:async()=>{calls.push('transcribe'); return 'I am feeling lonely today.';}, screen:async()=>{calls.push('screen'); return safe;}, approve:async()=>{calls.push('approve'); return true;}, ...overrides};
}
test('clear text is approved only after consent and safety checks', async () => {
  const d=deps(); assert.equal(await autoScreenConfession(input,d),'approved'); assert.deepEqual(d.calls,['screen','approve']);
});
test('refused or revoked permission never publishes', async () => {
  let count=0; const d=deps({permission:async()=>++count===1});
  assert.equal(await autoScreenConfession(input,d),'pending'); assert.deepEqual(d.calls,['screen']);
  const denied=deps({permission:async()=>false}); assert.equal(await autoScreenConfession(input,denied),'pending'); assert.deepEqual(denied.calls,[]);
  const noItemConsent=deps(); assert.equal(await autoScreenConfession({...input,itemConsent:false},noItemConsent),'pending'); assert.deepEqual(noItemConsent.calls,[]);
});
test('audio is not sent without its separate explicit consent', async () => {
  const d=deps(); assert.equal(await autoScreenConfession({...input,audio:{},audioConsent:false},d),'pending'); assert.deepEqual(d.calls,[]);
  const yes=deps(); assert.equal(await autoScreenConfession({...input,audio:{},audioConsent:true},yes),'approved'); assert.deepEqual(yes.calls,['transcribe','screen','approve']);
});
test('unclear, malformed, flagged, failed, or empty transcription stays pending', async () => {
  for (const d of [deps({screen:async()=>'{invalid'}),deps({screen:async()=>JSON.stringify({publish:true,uncertain:true,flags:[],summary:'Unclear'})}),deps({screen:async()=>JSON.stringify({publish:true,uncertain:false,flags:['privacy'],summary:'Contact details'})}),deps({screen:async()=>{throw Error('down');}}),deps({transcribe:async()=>''})]) {
    assert.equal(await autoScreenConfession({...input,audio:{},audioConsent:true},d),'pending'); assert.ok(!d.calls.includes('approve'));
  }
});
test('concerning words and a changed database state cannot be auto-published', async () => {
  const risky=deps(); assert.equal(await autoScreenConfession({...input,body:'My email is me@example.com'},risky),'pending'); assert.deepEqual(risky.calls,[]);
  const changed=deps({approve:async()=>false}); assert.equal(await autoScreenConfession(input,changed),'unchanged');
});
test('a safety signal found in consented audio is held and marked without passing its transcript to the marker', async () => {
  let marked;
  const d=deps({transcribe:async()=> 'I want to hurt myself', flag:async value=>{marked=value;}});
  assert.equal(await autoScreenConfession({...input,body:'',audio:{},audioConsent:true},d),'pending');
  assert.equal(marked.id,input.id); assert.equal(marked.body,''); assert.ok(!JSON.stringify(marked).includes('hurt myself'));
  assert.ok(!d.calls.includes('approve'));
});
test('a flagged model decision is held and marked for review', async () => {
  let marked=false;
  const d=deps({screen:async()=>JSON.stringify({publish:false,uncertain:false,flags:['self_harm'],summary:'Needs human review'}),flag:async()=>{marked=true;}});
  assert.equal(await autoScreenConfession(input,d),'pending'); assert.equal(marked,true); assert.ok(!d.calls.includes('approve'));
});
