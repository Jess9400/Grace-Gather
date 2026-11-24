import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function client(file){const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:(path)=>client(path.replace("./","")+".ts")});return module.exports;}
const words=JSON.parse(readFileSync(new URL('../src/generated/stepbible/lexicon.json',import.meta.url),'utf8'));
const {findStepWords}=client('stepbible.ts');
const {planPassage,normalizePlanProgress,readingPlans,readingPlanLength,yearPlanIndex,yearDayPassages}=client('reading-plans.ts');
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
test('all reading plans have localized titles and valid passage bounds',()=>{
 const {readingPlans}=client('reading-plans.ts');
 const copy=JSON.parse(readFileSync(new URL('../src/lib/pro-study-preview.json',import.meta.url),'utf8'));
 assert.equal(readingPlans.length,14);
 for(const language of ['en','pt','es','ru']){
  assert.equal(copy[language].planTitles.length,readingPlans.length+1);
  assert.equal(copy[language].devotionalActions.length,7);
 }
 for(const plan of readingPlans) for(const passage of plan){
  const book=JSON.parse(readFileSync(new URL(`../src/generated/bible/${passage.book}.json`,import.meta.url),'utf8'));
  const verses=book.chapters[passage.chapter];
  assert.ok(verses?.length,`${passage.book} ${passage.chapter}`);
  if(passage.from) assert.ok(passage.from<=verses.length);
  if(passage.to) assert.ok(passage.to<=verses.length);
 }
});
test('devotional plan progress survives older saves and clamps invalid values',()=>{
 assert.equal(normalizePlanProgress({}).devotionalDay,null);
 assert.equal(normalizePlanProgress({devotionalDay:3}).devotionalDay,3);
 assert.equal(normalizePlanProgress({devotionalDay:99}).devotionalDay,7);
 assert.equal(normalizePlanProgress({devotionalDay:-1}).devotionalDay,null);
});

test('Bible in a Year covers each chapter exactly once in each selected canon',()=>{
 assert.equal(readingPlanLength(yearPlanIndex),365);
 for(const edition of ['bible','bible-dra','bible-brenton','bible-blivre','bible-rv1909','bible-synodal']){
  const {books}=JSON.parse(readFileSync(new URL(`../src/generated/${edition}/index.json`,import.meta.url),'utf8'));
  const days=Array.from({length:365},(_,day)=>yearDayPassages(books,day));
  assert.ok(days.every(day=>day.length>=1));
  const chapters=days.flat().map(p=>`${p.book}.${p.chapter}`);
  assert.equal(chapters.length,new Set(chapters).size);
  assert.equal(chapters.length,books.reduce((sum,book)=>sum+book.chapters,0));
 }
 assert.equal(normalizePlanProgress({active:yearPlanIndex,days:{[yearPlanIndex]:999}}).days[yearPlanIndex],365);
 assert.equal(yearDayPassages([],366).length,0);
});

test('dashboard counts completed books only after every chapter is read',()=>{
 const {studyStats}=client('study-progress.ts');
 const books=[{code:'MRK',chapters:16},{code:'RUT',chapters:4},{code:'MAT',chapters:28}];
 assert.equal(studyStats(normalizePlanProgress({days:{0:15,2:3}}),books).books,0);
 assert.equal(studyStats(normalizePlanProgress({days:{0:16,4:4}}),books).books,2);
 assert.equal(studyStats(normalizePlanProgress({days:{0:16,4:4}}),books).readings,20);
});
