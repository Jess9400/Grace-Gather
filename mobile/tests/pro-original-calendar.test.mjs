import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');const json=(file)=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const manuscript=json('content/devotionals/year1/01.json');
function compile(rows,review,preview=false){const dir=mkdtempSync(join(tmpdir(),'gg-devotional-test-'));const output=join(dir,'out');const source=JSON.stringify(rows);writeFileSync(join(dir,'01.json'),source);if(review)writeFileSync(join(dir,'01.review.json'),JSON.stringify({...review,contentSha256:review.stale?'invalid':createHash('sha256').update(source).digest('hex')}));const result=spawnSync(process.execPath,[new URL('../scripts/compile-devotionals.mjs',import.meta.url).pathname,...(preview?['--preview']:[])],{env:{...process.env,DEVOTIONAL_EDITORIAL_PREVIEW:'false',DEVOTIONAL_SOURCE_DIRECTORY:dir,DEVOTIONAL_OUTPUT_DIRECTORY:output},encoding:'utf8'});return{...result,read:(file)=>JSON.parse(readFileSync(join(output,file+'.json'),'utf8'))};}
const approved={status:'approved',reviewers:[{name:'Jessica',approved:true},{name:'Taya',approved:true}],reviewedAt:'2026-11-25',languages:['en','pt','es','ru']};
test('365 dated slots do not restart weekly, annually, or after missing content',()=>{const r=compile(manuscript,null,true);assert.equal(r.status,0,r.stderr);const schedule=r.read('schedule');assert.equal(schedule.length,365);assert.equal(new Set(schedule.map(d=>d.date)).size,365);assert.equal(new Set(schedule.map(d=>d.id)).size,365);assert.equal(schedule[0].date,'2026-11-25');assert.equal(schedule.at(-1).date,'2027-11-24');assert.equal(schedule[31].status,'planned');assert.equal(r.read('catalog').length,31);});
test('draft content is excluded from production and requires both reviewers',()=>{assert.deepEqual(compile(manuscript,null).read('catalog'),[]);const one=compile(manuscript,{...approved,reviewers:approved.reviewers.slice(0,1)});assert.notEqual(one.status,0);const stale=compile(manuscript,{...approved,stale:true});assert.notEqual(stale.status,0);const ready=compile(manuscript,approved);assert.equal(ready.status,0,ready.stderr);assert.equal(ready.read('catalog').length,31);});
test('changing day order preserves content identity; repeated actions and missing translations fail',()=>{const shuffled=[...manuscript].reverse();const r=compile(shuffled,null,true);assert.equal(r.read('catalog')[0].reference,manuscript[0].reference);let rows=structuredClone(manuscript);rows[1].pt[2]=rows[0].pt[2].toUpperCase()+'!';assert.notEqual(compile(rows,null,true).status,0);rows=structuredClone(manuscript);delete rows[0].ru;assert.notEqual(compile(rows,null,true).status,0);});
test('every drafted verse exists in all four full-language readers',()=>{for(const edition of ['bible','bible-blivre','bible-rv1909','bible-synodal'])for(const row of manuscript){const [code,ch,v]=row.reference.split('.');const book=json(`src/generated/${edition}/${code}.json`);assert.ok(book.chapters[ch]?.some(verse=>Number(verse.number)===Number(v)),`${edition} ${row.reference}`);}});
const source=json('src/generated/study-original/manifest.json');
test('original reader has all 39 Hebrew/Aramaic OT books and 27 Greek NT books',()=>{assert.equal(Object.keys(source.books).length,66);for(const file of source.files)assert.match(file.sha256,/^[a-f0-9]{64}$/);assert.equal(json('public/study-original/v1/chapters/GEN/1.json')['1'].length,7);const john=json('public/study-original/v1/chapters/JHN/1.json')['1'];assert.equal(john.length,17);assert.ok(john.some(word=>word[2].includes('G3056')));assert.ok(john.every(word=>word[0]&&!word[0].includes('(')));});
test('every concordance hit resolves to a verse containing that lexical ID',()=>{for(const file of ['G30','H04','H79']){const shard=json(`public/study-original/v1/concordance/${file}.json`);for(const [id,refs]of Object.entries(shard)){assert.equal(refs.length,new Set(refs).size);for(const ref of refs.slice(0,20)){const[b,c,v]=ref.split('.');const words=json(`public/study-original/v1/chapters/${b}/${c}.json`)[v];assert.ok(words.some(word=>word[2].some(s=>s===id||s.slice(0,5)===id)),ref+' '+id);}}}});
test('readable grammar does not translate a Hebrew stem into a Greek tense',()=>{const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/original-grammar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});const grammar=module.exports.grammarDescription;assert.match(grammar('N-NSM','en'),/noun.*nominative.*singular.*masculine/);assert.match(grammar('HNcmpa','pt'),/substantivo.*masculino.*plural/);assert.match(grammar('V-PAI-3S','es'),/verbo.*presente.*indicativo/);});
test('runtime calendar returns no replacement after an unpublished date or year end',()=>{const r=compile(manuscript,null,true);const module={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../src/lib/devotional-calendar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;runInNewContext(code,{module,exports:module.exports,require:(path)=>path.includes('catalog')?r.read('catalog'):r.read('schedule')});const f=module.exports.devotionalForDate;assert.equal(f('2026-11-25').day,1);assert.equal(f('2026-12-25').day,31);assert.equal(f('2026-12-26'),null);assert.equal(f('2027-11-25'),null);assert.notEqual(f('2026-11-25').en[1],f('2026-12-02').en[1]);});
test('publication gaps keep the latest approved entry without exposing future or draft entries',()=>{
 const r=compile(manuscript,approved);
 const module={exports:{}};
 const code=ts.transpileModule(readFileSync(new URL('../src/lib/devotional-calendar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(path)=>path.includes('catalog')?r.read('catalog'):r.read('schedule')});
 const f=module.exports.latestDevotionalForDate;
 assert.equal(f('2026-11-24'),null);
 assert.equal(f('2026-11-26').day,2);
 assert.equal(f('2026-12-26').day,31);
 assert.equal(f('2026-12-26').date,'2026-12-25');
 const ms=module.exports.millisecondsUntilNextLocalDay;
 assert.equal(ms(new Date(2026,10,26,23,59,59,750)),250);
 assert.ok(ms(new Date(2026,10,26,0,0,0))>0);
});

test('second monthly batch adds 30 translated days without publishing unapproved content', () => {
 const next=json('content/devotionals/year1/02.json');
 assert.deepEqual(next.map(r=>r.day),Array.from({length:30},(_,i)=>i+32));
 assert.equal(new Set([...manuscript,...next].map(r=>r.reference)).size,61);
 for(const edition of ['bible','bible-blivre','bible-rv1909','bible-synodal'])for(const row of next){
  const [book,ch,v]=row.reference.split('.');
  assert.ok(json(`src/generated/${edition}/${book}.json`).chapters[ch]?.some(verse=>Number(verse.number)===Number(v)),`${edition} ${row.reference}`);
 }
 const production=compile([...manuscript,...next],null);
 assert.equal(production.status,0,production.stderr);
 assert.equal(production.read('catalog').length,0);
 const preview=compile([...manuscript,...next],null,true);
 assert.equal(preview.status,0,preview.stderr);
 assert.equal(preview.read('catalog').length,61);
 assert.equal(preview.read('schedule')[31].date,'2026-12-26');
 assert.equal(preview.read('schedule')[60].date,'2027-01-24');
 assert.equal(json('content/devotionals/year1/02.review.json').status,'draft');
 assert.ok(next.every(row=>['en','pt','es','ru'].every(lang=>row[lang].length===4)));
});
