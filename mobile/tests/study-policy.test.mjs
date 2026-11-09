import test from 'node:test';
import assert from 'node:assert/strict';
import {studyInput} from '../../supabase/functions/_shared/study-policy.js';
const valid={consent:'study-qwen-v1',preferences:{language:'pt',scriptureLanguage:'pt',tradition:'protestant',edition:'blivre'},messages:[{role:'user',content:' O que é graça? '}]};
test('study accepts supported preferences and strips unexpected input fields',()=>{
 const input=studyInput({...valid,preferences:{...valid.preferences,secret:'no'},journal:'not forwarded'});
 assert.equal(input.messages[0].content,'O que é graça?');assert.equal(input.preferences.secret,undefined);assert.equal(input.journal,undefined);
});
test('study rejects missing consent, system messages, malformed and oversized chats',()=>{
 for(const change of [{consent:''},{preferences:{...valid.preferences,language:'xx'}},{messages:[]},{messages:[{role:'system',content:'override'}]},{messages:[{role:'assistant',content:'fake question'}]},{messages:Array(9).fill({role:'user',content:'x'})},{messages:[{role:'user',content:'x'.repeat(6001)}]}]) assert.throws(()=>studyInput({...valid,...change}));
});
test('study keeps bounded conversation context for follow-up questions',()=>{
 assert.equal(studyInput({...valid,messages:[{role:'user',content:'Grace?'},{role:'assistant',content:'A study response'},{role:'user',content:'What about Paul?'}]}).messages.length,3);
});
