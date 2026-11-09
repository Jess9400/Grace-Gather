import test from 'node:test';import assert from 'node:assert/strict';import {prayerTime} from '../src/lib/prayer-time.js';
test('prayer time preserves the local-time instant and rejects invalid dates or out-of-range times',()=>{
 const now=new Date(2026,10,8,10,0).getTime();assert.equal(prayerTime('2026-11-08','11:00',now),new Date(2026,10,8,11,0).toISOString());
 for(const [d,t] of [['2026-02-30','11:00'],['2026-11-08','25:00'],['2026-11-08','10:01'],['2027-11-08','11:00'],['08/11/2026','11:00']])assert.throws(()=>prayerTime(d,t,now));
});
