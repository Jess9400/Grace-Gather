import test from 'node:test';import assert from 'node:assert/strict';import {prayerTime} from '../src/lib/prayer-time.js';
test('prayer time preserves the local-time instant and rejects invalid dates or out-of-range times',()=>{
 const now=new Date(2026,10,8,10,0).getTime();assert.equal(prayerTime('2026-11-08','11:00',now),new Date(2026,10,8,11,0).toISOString());
 for(const [d,t] of [['2026-02-30','11:00'],['2026-11-08','25:00'],['2026-11-08','10:01'],['2027-11-08','11:00'],['08/11/2026','11:00']])assert.throws(()=>prayerTime(d,t,now));
});

test('missing scheduling fields give specific errors and surrounding spaces are harmless', () => {
 const now=new Date(2026,10,8,10,0).getTime();
 assert.throws(()=>prayerTime('', '11:00', now), /Choose a prayer date/);
 assert.throws(()=>prayerTime('2026-11-08', '', now), /Choose a prayer time/);
 assert.throws(()=>prayerTime('2026-02-30', '11:00', now), /does not exist/);
 assert.equal(prayerTime(' 2026-11-08 ', ' 11:00 ', now),new Date(2026,10,8,11,0).toISOString());
});
test('a previewed time must still be at least five minutes away when shared', () => {
 const start = new Date(2026,10,8,10,0).getTime();
 assert.doesNotThrow(()=>prayerTime('2026-11-08','10:10',start));
 assert.throws(()=>prayerTime('2026-11-08','10:10',start+6*60000), /5 minutes/);
});
