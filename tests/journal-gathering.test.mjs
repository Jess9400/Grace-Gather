import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
import {createContext,runInContext} from 'node:vm';
const source=readFileSync(new URL('../mobile/src/lib/journal-gathering.ts',import.meta.url),'utf8');
const ctx=createContext({exports:{},require:(id)=>{if(id.endsWith('/discover')) return {storyText:(x,lang)=>typeof x==='string'?x:x[lang]||''};throw Error(id)}});
runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const match=ctx.exports.matchingJournalGathering;
const now=Date.parse('2026-11-10T00:00:00Z');
const item=(overrides={})=>({id:'ok',status:'published',visibility:'public',language:'en',starts_at:'2026-11-11T00:00:00Z',ends_at:'2026-11-11T01:00:00Z',topic:'Loneliness',title:{en:'Finding connection'},...overrides});
test('only a relevant upcoming public session in the user language can be matched',()=>{
 const rows=[item({id:'private',visibility:'invite'}),item({id:'past',starts_at:'2026-11-01T00:00:00Z'}),item({id:'draft',status:'draft'}),item({id:'wrong-language',language:'pt'}),item({id:'unrelated',topic:'Music'}),item()];
 assert.equal(match(rows,'lonely','en',now).id,'ok');
 assert.equal(match(rows.slice(0,-1),'lonely','en',now),undefined);
 assert.equal(match([item()],'persistent-distress','en',now),undefined);
 assert.equal(match([item({id:'depression',topic:'Depression support'})],'persistent-distress','en',now).id,'depression');
 assert.equal(match([item()],'unknown','en',now),undefined);
});
