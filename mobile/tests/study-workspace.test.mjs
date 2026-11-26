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

test('plan filters cover every plan and match their shelves',()=>{
 const {planGroups,planFilters,planMatches,readingPlans,yearPlanIndex}=client('reading-plans.ts');
 assert.equal(planGroups.length,readingPlans.length);
 const copy=JSON.parse(readFileSync(new URL('../src/lib/pro-study-preview.json',import.meta.url),'utf8'));
 for(const language of ['en','pt','es','ru']) assert.equal(copy[language].filters.length,planFilters.length);
 for(let plan=0;plan<=yearPlanIndex;plan++) assert.ok(planMatches(plan,'all'));
 assert.ok(planMatches(1,'short'));
 assert.ok(!planMatches(0,'short'));
 assert.ok(!planMatches(yearPlanIndex,'short'));
 assert.ok(planMatches(3,'letters'));
 assert.ok(planMatches(4,'stories'));
 for(const filter of planFilters.slice(2)) assert.ok(planGroups.some(group=>group===filter),filter);
});

test('progress from two devices combines without losing a day read',()=>{
 const {mergePlanProgress,samePlanProgress,normalizeToday,mergeToday}=client('study-progress.ts');
 const phone=normalizePlanProgress({active:0,devotionalDay:2,days:{0:5,3:1}});
 const web=normalizePlanProgress({active:4,devotionalDay:null,days:{0:3,4:2}});
 const merged=mergePlanProgress(phone,web,true);
 assert.equal(merged.days[0],5);assert.equal(merged.days[3],1);assert.equal(merged.days[4],2);
 assert.equal(merged.devotionalDay,2);
 assert.equal(merged.active,4,'the device that changed it last picks the current plan');
 assert.equal(mergePlanProgress(phone,web,false).active,0);
 assert.ok(samePlanProgress(merged,mergePlanProgress(merged,phone,false)));
 assert.ok(!samePlanProgress(merged,phone));
 const plain=(x)=>JSON.parse(JSON.stringify(x));
 const today=normalizeToday({day:'2026-11-25',done:[0,7,'x'],days:['2026-11-24','bad']});
 assert.deepEqual(plain(today),{day:'2026-11-25',done:[0],days:['2026-11-24']});
 const both=mergeToday(today,{day:'2026-11-25',done:[1,2],days:['2026-11-25']});
 assert.deepEqual(plain(both),{day:'2026-11-25',done:[0,1,2],days:['2026-11-24','2026-11-25']});
 const older=mergeToday(today,{day:'2026-11-20',done:[0,1,2],days:[]});
 assert.deepEqual(plain(older.done),[0],'yesterday\'s ticks never fill today');
});

test('multiple plans survive older saves and device sync without replacing each other',()=>{
 const {mergePlanProgress}=client('study-progress.ts');
 const first=normalizePlanProgress({active:2,days:{0:1,2:1}});
 assert.deepEqual(Array.from(first.started).sort(),[0,2]);
 const next=normalizePlanProgress({...first,active:1,started:[...first.started,1]});
 const merged=mergePlanProgress(first,next,true);
 assert.deepEqual(Array.from(merged.started),[0,1,2]);
 assert.equal(merged.days[0],1);assert.equal(merged.days[2],1);
});
test('returning to any started plan resumes it even when another plan is active',()=>{
 const {hasStartedPlan}=client('reading-plans.ts');
 const progress={active:1,started:[0,1],days:{0:0,1:2},devotionalDay:null};
 assert.equal(hasStartedPlan(progress,0),true);
 assert.equal(hasStartedPlan(progress,1),true);
 assert.equal(hasStartedPlan(progress,2),false);
 assert.equal(hasStartedPlan({...progress,started:[],days:{0:3}},0),true);
});
