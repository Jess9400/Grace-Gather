import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
import {createContext,runInContext} from 'node:vm';
import {quietMood,hopelessWriting} from '../shared/quiet-diary.js';
import {chooseJournalAction} from '../supabase/functions/_shared/journal-selection.js';
const map=JSON.parse(readFileSync(new URL('../mobile/src/generated/journal-map.json',import.meta.url)));
const source=readFileSync(new URL('../mobile/src/lib/journal-guidance.ts',import.meta.url),'utf8');
const context=createContext({exports:{},require:(id)=>{
 if(id.endsWith('journal-map.json')) return map;
 if(id.endsWith('journal-selection')) return {chooseJournalAction};
 if(id.endsWith('quiet-diary')) return {hopelessWriting};
 if(id.endsWith('church-calendar')) return {welcomesCandles:()=>false};
 throw Error(id);
}});
runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,context);
const {journalTheme,journalAction}=context.exports;
function entry(text,extra={}) {return {text,mood:quietMood(text),...extra};}
test('hopeless writing chooses a private reflection, including older sadness entries',()=>{
 for(const text of ['I am feeling hopeless','Nothing is going to change','Estou sem esperança','Me siento sin esperanza','Я чувствую безнадёжность']) {
  assert.equal(quietMood(text),'hopeless');
  assert.equal(journalTheme(entry(text,{mood:'sad'})).id,'hopelessness');
  assert.equal(journalAction(entry(text),{}),'A08');
 }
 assert.equal(journalAction(entry('I am feeling hopeless',{themeId:'hopelessness',suggestedAction:'A04'}),{}),'A08');
});
test('negation and persistent distress are not converted into the hope exercise',()=>{
 assert.equal(hopelessWriting('I am not feeling hopeless'),false);
 assert.equal(hopelessWriting('I no longer feel hopeless'),false);
 assert.equal(journalTheme(entry('I have felt hopeless for weeks')).id,'persistent-distress');
 assert.equal(journalAction(entry('I have felt hopeless for weeks'),{}),'A05');
});
test('different needs keep distinct actions and model suggestions',()=>{
 assert.equal(journalAction(entry('I am grateful and want to thank my friend'),{}),'A12');
 assert.equal(journalAction(entry('I need someone to listen'),{}),'A04');
 assert.equal(journalAction(entry('I feel hopeless',{themeId:'hopelessness',suggestedAction:'A19'}),{}),'A19');
});
