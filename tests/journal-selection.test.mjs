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
