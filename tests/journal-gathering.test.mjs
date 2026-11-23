import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
import {createContext,runInContext} from 'node:vm';
const source=readFileSync(new URL('../mobile/src/lib/journal-gathering.ts',import.meta.url),'utf8');
const map=JSON.parse(readFileSync(new URL('../mobile/src/generated/journal-map.json',import.meta.url)));
let sessions=[], room={items:[],reserved:[]}, staff=false;
const modules={
 './discover': {storyText:(x,lang)=>typeof x==='string'?x:x[lang]||''},
 './gatherings': {gathering:async()=>sessions},
 './confession': {confessionAPI:async(action,params)=>{
   assert.equal(action,'list');assert.deepEqual(Object.keys(params),['language']);
   if (!room) throw Error('offline'); return room;
 }},
 './backend': {backend:{rpc:async()=>({data:staff})}},
 '../generated/journal-map.json': map,
};
const ctx=createContext({exports:{},setTimeout,clearTimeout,require:id=>modules[id]});
runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const match=ctx.exports.matchingJournalGathering;
const now=Date.parse('2026-11-10T00:00:00Z');
const item=(overrides={})=>({id:'ok',status:'published',visibility:'public',language:'en',starts_at:'2026-11-11T00:00:00Z',ends_at:'2026-11-11T01:00:00Z',topic:'Loneliness',title:{en:'Finding connection'},...overrides});
test('only a relevant upcoming public session in the user language can be matched',()=>{
 const rows=[item({id:'private',visibility:'invite'}),item({id:'past',starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-11-01T01:00:00Z'}),item({id:'draft',status:'draft'}),item({id:'wrong-language',language:'pt'}),item({id:'unrelated',topic:'Music'}),item()];
 assert.equal(match(rows,'lonely','en',now).id,'ok');
 assert.equal(match(rows.slice(0,-1),'lonely','en',now),undefined);
 assert.equal(match([item()],'persistent-distress','en',now),undefined);
 assert.equal(match([item({id:'depression',topic:'Depression support'})],'persistent-distress','en',now).id,'depression');
 assert.equal(match([item()],'unknown','en',now),undefined);
});


test('uses the row fallback when the matching community activity is unavailable',async()=>{
 const check=(id,theme,text='',previous=[])=>ctx.exports.availableJournalAction(id,theme,'en',text,previous);
 sessions=[item({starts_at:new Date(Date.now()-60000).toISOString(),ends_at:new Date(Date.now()+3600000).toISOString()})];
 assert.equal(await check('A25','lonely'),'A25');
 sessions=[];
 assert.equal(await check('A25','homesick'),'A07');
 assert.equal(await check('A25','welcome'),'A11');
 assert.equal(await check('A25','lonely','I have nobody to talk to'),'A04');
 assert.equal(await check('A14','listen'),'A11');
 assert.equal(await check('A14','listen','',['A11']),undefined);
 room={items:[{id:'eligible'}],reserved:[]};
 assert.equal(await check('A14','listen'),'A14');
 room=null;
 assert.equal(await check('A04','venting'),'A03');
 assert.equal(await check('A25','lonely','I have nobody to talk to'),'A08');
 assert.equal(await check('A27','welcome'),'A11');
 staff=true;
 assert.equal(await check('A27','welcome'),'A27');
});
