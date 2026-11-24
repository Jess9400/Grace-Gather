import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function client(file){const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports;}
const words=JSON.parse(readFileSync(new URL('../src/generated/stepbible/lexicon.json',import.meta.url),'utf8'));
const {findStepWords}=client('stepbible.ts');
const {planPassage,normalizePlanProgress}=client('reading-plans.ts');
test('STEP searches short Strong IDs, unaccented Greek and transliteration without merging senses',()=>{
 assert.ok(words.length>20000);
 assert.equal(new Set(words.map(w=>w.id)).size,words.length);
 assert.ok(findStepWords(words,'g3056').some(w=>w.gloss==='word'));
 assert.ok(findStepWords(words,'G5').some(w=>w.strong==='G0005'));
 assert.ok(findStepWords(words,'λογος').some(w=>w.strong==='G3056'));
 assert.ok(findStepWords(words,'shalom').some(w=>w.strong==='H7965'));
 assert.ok(findStepWords(words,'H2','aramaic').every(w=>w.language==='aramaic'));
 assert.ok(findStepWords(words,'H2','aramaic').length>0);
 assert.equal(findStepWords(words,'G3056','hebrew').length,0);
 assert.equal(findStepWords(words,'').length,0);
 assert.ok(words.every(w=>!Object.hasOwn(w,'definition')));
});
test('Psalm plan uses verified edition numbering and rejects missing days',()=>{
 assert.equal(planPassage(1,0,'web').chapter,23);
 for(const collection of ['dra','brenton','synodal']){
  const passage=planPassage(1,0,collection);
  assert.equal(passage.chapter,22);
  const book=JSON.parse(readFileSync(new URL(`../src/generated/bible-${collection}/PSA.json`,import.meta.url),'utf8'));
  assert.ok(book.chapters[passage.chapter]?.length>0);
 }
 assert.equal(planPassage(20,0,'web'),null);
 assert.equal(planPassage(0,50,'web'),null);
});
test('persisted reading progress tolerates invalid and older values',()=>{
 assert.equal(normalizePlanProgress(null).active,null);
 const value=normalizePlanProgress({active:0,days:{0:99,1:-4,2:'broken'}});
 assert.equal(value.days[0],16);assert.equal(value.days[1],0);assert.equal(value.days[2],0);
 assert.equal(normalizePlanProgress({active:999}).active,null);
});
