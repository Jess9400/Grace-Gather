import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AI_CONSENT_VERSION, journeyInput, recommendations, needsSupport, readBounded } from '../supabase/functions/_shared/journey-policy.js';
const catalog = JSON.parse(await readFile(new URL('../supabase/functions/_shared/journey-catalog.json',import.meta.url)));
const preferences={language:'en',scriptureLanguage:'en',tradition:'protestant',edition:catalog.editions.find(e=>e.language==='en'&&e.traditions.includes('protestant')).id};
test('AI requires current consent, bounded writing and supported preferences',()=>{
  assert.throws(()=>journeyInput({text:'Hello',preferences}),/consent_required/);
  assert.throws(()=>journeyInput({text:'x'.repeat(30001),preferences,consentVersion:AI_CONSENT_VERSION}),/invalid_entry/);
  assert.throws(()=>journeyInput({text:'Hello',preferences:{...preferences,language:'xx'},consentVersion:AI_CONSENT_VERSION}),/invalid_preferences/);
  const input=journeyInput({text:'  Hello  ',preferences:{...preferences,email:'private@example.com',name:'Private'},consentVersion:AI_CONSENT_VERSION});
  assert.equal(input.text,'Hello');assert.equal(input.preferences.email,undefined);assert.equal(input.preferences.name,undefined);
});
test('model cannot inject quotations or select another tradition or language',()=>{
  for(const edition of catalog.editions){
    const prefs={...preferences,scriptureLanguage:edition.language,edition:edition.id,tradition:edition.traditions[0]};
    const result=recommendations({path:'sad',support:false,passageIds:['invented'],quote:'Invented verse'},prefs,catalog);
    assert.ok(result.passageIds.every(id=>edition.passages.some(p=>p.id===id&&p.theme===catalog.PATHS.sad.theme)));
    assert.deepEqual(result.actionIds,catalog.PATHS.sad.actions.slice(0,3));
    assert.equal(result.quote,undefined);
  }
  assert.deepEqual(recommendations({path:'sad',support:false},{...preferences,scriptureLanguage:'pt'},catalog).passageIds,[]);
  assert.throws(()=>recommendations({path:'invented',support:false},preferences,catalog),/invalid_model_response/);
  assert.throws(()=>recommendations({path:'sad',support:'false'},preferences,catalog),/invalid_model_response/);
});
test('support routing never returns ordinary recommendations and recognizes four languages',()=>{
  for(const text of ['I want to kill myself','Quero me matar','Quiero quitarme la vida','Хочу покончить с собой'])assert.equal(needsSupport(text),true);
  assert.deepEqual(recommendations({path:'sad',support:true},preferences,catalog),{path:'unsure',support:true,passageIds:[],actionIds:[]});
});
test('oversized requests are rejected even without Content-Length',async()=>{
  const request=()=>new Request('http://localhost',{method:'POST',body:'abcdef'});
  await assert.rejects(readBounded(request(),5),/too_large/);
  assert.equal(await (await readBounded(request(),6)).text(),'abcdef');
});
