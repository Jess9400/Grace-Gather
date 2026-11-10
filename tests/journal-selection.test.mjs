import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJournalAction,weeklyCheckInDue} from '../supabase/functions/_shared/journal-selection.js';
const map=JSON.parse(await readFile(new URL('../supabase/functions/_shared/journal-map.json',import.meta.url)));
test('client and server use the same map and selection rules',async()=>{
 for(const name of ['journal-map.json','journal-selection.js'])assert.equal(await readFile(new URL('../mobile/src/generated/'+name,import.meta.url),'utf8'),await readFile(new URL('../supabase/functions/_shared/'+name,import.meta.url),'utf8'));
});
test('actions respect private preferences, candles, financial stress and availability',()=>{
 for(const theme of map){
  assert.ok(!['A01','A21','A06','A25','A22','A17','A14'].includes(chooseJournalAction(theme)));
  assert.notEqual(chooseJournalAction(theme,{financialStress:true}),'A18');
 }
 assert.equal(chooseJournalAction({main:'A01',private:'A08'},{candles:true}),'A01');
 assert.equal(chooseJournalAction({main:'A01',private:'A08'},{privateOnly:true,candles:true}),'A08');
});
test('weekly invitation waits seven days, and dismissal resets the cooldown',()=>{
 const now=Date.parse('2026-11-09T12:00:00Z');
 assert.equal(weeklyCheckInDue([],undefined,now),false);
 assert.equal(weeklyCheckInDue(['invalid'],undefined,now),false);
 assert.equal(weeklyCheckInDue(['2026-11-02T12:00:01Z'],undefined,now),false);
 assert.equal(weeklyCheckInDue(['2026-11-02T12:00:00Z'],undefined,now),true);
 assert.equal(weeklyCheckInDue(['2026-10-01'],new Date(now).toISOString(),now),false);
});

test('connected actions follow the expressed need without breaking older clients',()=>{
 const theme=id=>map.find(x=>x.id===id);
 assert.equal(chooseJournalAction(theme('lonely'),{connectedActions:true}),'A25');
 assert.equal(chooseJournalAction(theme('listen'),{connectedActions:true}),'A14');
 assert.equal(chooseJournalAction(theme('service'),{connectedActions:true}),'A18');
 assert.equal(chooseJournalAction({main:'A27',private:'A08'},{connectedActions:true}),'A27');
 assert.equal(chooseJournalAction({main:'A27',private:'A08'},{connectedActions:false}),'A18');
 assert.equal(chooseJournalAction(theme('lonely'),{connectedActions:true,privateOnly:true}),'A08');
 assert.equal(chooseJournalAction(theme('grief'),{connectedActions:true,candles:false}),'A02');
 assert.equal(chooseJournalAction(theme('grief'),{connectedActions:true,candles:true}),'A01');
 assert.equal(chooseJournalAction(theme('service'),{connectedActions:true,financialStress:true}),'A03');
});

test('initial AI selections accept connected destinations only for compatible clients',async()=>{
 const {recommendations}=await import('../supabase/functions/_shared/journey-policy.js');
 const catalog=JSON.parse(await readFile(new URL('../supabase/functions/_shared/journey-catalog.json',import.meta.url)));
 const prefs={edition:'web',scriptureLanguage:'en',tradition:'protestant',candlePractice:false};
 const cases=[['lonely','lonely','A25'],['peaceful','listen','A14'],['grateful','service','A18'],['peaceful','welcome','A27']];
 for(const [path,themeId,actionId] of cases){
  const request={path,themeId,actionId,support:false};
  assert.equal(recommendations(request,prefs,catalog,true).suggestedAction,actionId);
  if(actionId!=='A18')assert.notEqual(recommendations(request,prefs,catalog,false).suggestedAction,actionId);
 }
 assert.equal(recommendations({path:'lonely',themeId:'lonely',actionId:'A25',support:false,privateOnly:true},prefs,catalog,true).suggestedAction,'A08');
});

test('an AI explanation survives only for the validated action it describes',async()=>{
 const {recommendations}=await import('../supabase/functions/_shared/journey-policy.js');
 const catalog=JSON.parse(await readFile(new URL('../supabase/functions/_shared/journey-catalog.json',import.meta.url)));
 const prefs={edition:'web',scriptureLanguage:'en',tradition:'protestant',candlePractice:false};
 const base={path:'lonely',themeId:'lonely',actionId:'A25',actionExplanation:'A gathering can help you connect with others.',support:false};
 assert.equal(recommendations(base,prefs,catalog,true).actionExplanation,base.actionExplanation);
 assert.equal(recommendations(base,prefs,catalog,false).actionExplanation,undefined);
 assert.equal(recommendations({...base,privateOnly:true},prefs,catalog,true).actionExplanation,undefined);
 for(const bad of ['', 'x'.repeat(241), 'Go to https://example.test', '<b>click</b>', 'line one\nline two'])
  assert.equal(recommendations({...base,actionExplanation:bad},prefs,catalog,true).actionExplanation,undefined);
 const candle={...base,path:'sad',themeId:'grief',actionId:'A01',actionExplanation:'Light a candle.'};
 assert.equal(recommendations(candle,prefs,catalog,true).suggestedAction,'A02');
 assert.equal(recommendations(candle,prefs,catalog,true).actionExplanation,undefined);
});
