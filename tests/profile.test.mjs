import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createAPI,validateProfile} from '../worker/api.js';
import {sqliteAdapter} from '../scripts/local-db.mjs';
import {dailyPassage,organizationsForCity} from '../dist/personalization.js';
import {ORGANIZATIONS} from '../dist/community-data.js';
import {PROFILE_COPY} from '../dist/profile-copy.js';
import {booksForMood,BOOKS} from '../dist/books.js';
const example={name:'Test reader',city:'São Paulo',region:'SP',country:'BR',intent:'calm',email:'',notifications:false};
test('profile data is account-scoped, independent of social data, and consent can be withdrawn',async()=>{
 const DB=sqliteAdapter();for(const f of (await readdir(new URL('../drizzle',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())DB.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const api=createAPI([]);const req=(user,body,method=body?'POST':'GET')=>api(new Request('https://still.test/api/profile',{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),Origin:'https://still.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{DB});
 try{assert.equal((await req(null,example)).status,401);assert.equal((await req('alice',{...example,email:'test@example.com',notifications:false})).status,400);
 await req('alice',{...example,user:'bob',email:'test@example.com',notifications:true});assert.equal((await (await req('bob')).json()).profile,null);
 let profile=(await (await req('alice')).json()).profile;assert.equal(profile.name,example.name);assert.equal(profile.notifications,true);assert.equal(profile.user,undefined);
 await req('alice',example);profile=(await (await req('alice')).json()).profile;assert.equal(profile.email,'');assert.equal(profile.notifications,false);
 await req('bob',example);await req('alice',{},'DELETE');assert.equal((await (await req('alice')).json()).profile,null);assert.ok((await (await req('bob')).json()).profile);
 }finally{DB.close();}
});
test('profile validation rejects absent required fields, invalid consent, control characters, and unsupported state codes',()=>{
 assert.deepEqual(validateProfile(example),example);
 for(const patch of [{name:''},{city:' '},{region:'XX'},{email:'invalid',notifications:true},{email:'test@example.com',notifications:false},{notifications:'yes'},{intent:'made-up'},{country:'ZZ'},{city:'x\nspoof'}])assert.equal(validateProfile({...example,...patch}),null,JSON.stringify(patch));
 assert.equal(validateProfile({...example,country:'PT',region:''}).country,'PT');
});
test('city matching handles accents and whitespace without substring or wrong-state matches',()=>{
 assert.equal(organizationsForCity(ORGANIZATIONS,{...example,city:' sao  paulo '}).length,3);
 assert.equal(organizationsForCity(ORGANIZATIONS,{...example,city:'Rio de Janeiro',region:'RJ'}).length,1);
 for(const profile of [null,{...example,city:'Paulo'},{...example,city:'Campinas'},{...example,region:'RJ'},{...example,country:'PT'}])assert.equal(organizationsForCity(ORGANIZATIONS,profile).length,0);
});
test('daily verse stays stable for the local day, rotates, and respects translation and tradition',async()=>{
 const {editions}=JSON.parse(await readFile(new URL('../dist/scripture.json',import.meta.url),'utf8'));const prefs={tradition:'protestant',scriptureLanguage:'en',edition:'web'};
 const first=dailyPassage(editions,prefs,new Date(2026,10,3,1)),later=dailyPassage(editions,prefs,new Date(2026,10,3,23)),next=dailyPassage(editions,prefs,new Date(2026,10,4));assert.equal(first.id,later.id);assert.notEqual(first.id,next.id);assert.equal(first.text,editions[0].passages.find(p=>p.id===first.id).text);
 assert.equal(dailyPassage(editions,{...prefs,tradition:'catholic',scriptureLanguage:'pt',edition:''}),null);
});
test('onboarding copy and curated reading cover all supported languages and journal feelings',()=>{
 for(const key of Object.keys(PROFILE_COPY.en))for(const lang of ['pt','es','ru'])assert.ok(PROFILE_COPY[lang][key],lang+key);
 for(const mood of ['sad','anxious','hopeless','lonely','overwhelmed','grateful','peaceful','hopeful','unsure'])assert.ok(booksForMood(mood,'en').length,mood);
 for(const book of BOOKS){assert.match(book.url,/^https:\/\//);for(const lang of ['en','pt','es','ru'])assert.ok(book.note[lang]);}
});
