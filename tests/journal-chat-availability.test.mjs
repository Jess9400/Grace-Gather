import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
import {createContext,runInContext} from 'node:vm';
function compile(file,require) {
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const ctx=createContext({exports:{},require,setTimeout,clearTimeout});
 runInContext(code,ctx); return ctx.exports;
}
const helper=compile('../mobile/src/lib/journal-gathering.ts', id => {
 if(id==='./discover')return {storyText:(v,l)=>typeof v==='string'?v:v[l]??''};
 throw Error(id);
});
const item={id:'1',status:'published',visibility:'public',language:'en',topic:'loneliness',title:{en:'Connection'},starts_at:new Date(Date.now()+86400000).toISOString(),ends_at:new Date(Date.now()+90000000).toISOString()};
function client(items){
 const ai=compile('../mobile/src/lib/ai.ts',id=>{
  if(id==='./backend')return {requireUser:async()=>({client:{functions:{invoke:async()=>({data:{reply:'Your words matter.',actionId:'A25',actionTheme:'lonely',actionExplanation:'A group could help you connect.',support:false}})}}})};
  if(id==='./church-calendar')return {welcomesCandles:()=>false};
  if(id==='./llm-contract')return {};
  if(id==='./ai-copy')return {AI_CONSENT_VERSION:'test'};
  if(id==='./ai-error')return {};
  if(id==='./journal-gathering')return helper;
  if(id==='./gatherings')return {gathering:async(action)=>{assert.equal(action,'list');return items}};
  throw Error(id);
 });
 return (text,previous=[])=>ai.continueJournal({text:'private original',prefs:{}},{journalAIConsentVersion:'test',language:'en'},[{role:'user',content:text}],previous);
}
test('chat confirms an available gathering before displaying its action',async()=>{
 assert.equal((await client([item])('I have no one to talk to')).actionId,'A25');
 const noMatch=await client([])('I have no one to talk to');
 assert.equal(noMatch.actionId,'A04');
 assert.equal(noMatch.actionExplanation,undefined);
 assert.equal((await client([item])('I have no one to talk to')).actionExplanation,'A group could help you connect.');
 assert.equal(noMatch.content,'Your words matter.');
 assert.equal((await client([])('I have no one to talk to',['A04'])).actionId,undefined);
 assert.equal((await client([])('I feel lonely')).actionId,undefined);
});
