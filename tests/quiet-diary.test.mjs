import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {quietMood,selectQuietPassage,savedJournalEntries,journalBackupAudioNames} from '../shared/quiet-diary.js';
const {editions}=JSON.parse(await readFile(new URL('../dist/scripture.json',import.meta.url)));
test('quiet replies use exactly the requested tradition, language and edition',()=>{
 for(const edition of editions){
  for(const tradition of edition.traditions){
   for(const mood of ['anxious','sad','grateful','lonely','overwhelmed','hopeful','unsure']){
    const verse=selectQuietPassage(editions,{tradition,scriptureLanguage:edition.language,edition:edition.id},mood);
    assert.ok(verse);assert.equal(verse.editionId,edition.id);assert.ok(edition.passages.some(p=>p.id===verse.id&&p.text===verse.text));assert.ok(verse.attribution&&verse.licenseUrl);
   }
  }
 }
 assert.equal(selectQuietPassage(editions,{tradition:'orthodox',scriptureLanguage:'pt',edition:'blivre'},'sad'),null);
 assert.equal(selectQuietPassage(editions,{tradition:'catholic',scriptureLanguage:'ru',edition:'synodal'},'sad'),null);
 assert.equal(selectQuietPassage(editions,{tradition:'catholic',scriptureLanguage:'en',edition:'web'},'sad'),null);
});
test('explicit feelings lead and unknown writing does not invent an emotion',()=>{
 assert.equal(quietMood('I am anxious',{grateful:3,anxious:1},'en'),'grateful');
 assert.equal(quietMood('I am not anxious',{},'en'),'unsure');
 assert.equal(quietMood('A new page',{},'en'),'unsure');
 assert.equal(quietMood('anxious',{},'ru'),'unsure');
 assert.equal(quietMood('',{sad:2},'pt'),'sad');
 assert.equal(quietMood('',{'__proto__':3,bogus:2},'en'),'unsure');
});
test('sadness selection respects each edition’s own reference and text',()=>{
 const verse=selectQuietPassage(editions,{tradition:'catholic',scriptureLanguage:'en',edition:'dra'},'sad');
 assert.match(verse.reference,/33:19/);
});
test('unsaved journal pages and their recordings are excluded from persistence and backups',()=>{
 const saved={id:'kept',text:'A kept page',audio:'kept-recording'},temporary={id:'visit',text:'Private temporary words',audio:'temporary-recording',sessionOnly:true};
 const entries=[saved,temporary];
 assert.deepEqual(savedJournalEntries(entries),[saved]);
 assert.deepEqual(journalBackupAudioNames(entries),['kept-recording.bin']);
 assert.equal(entries.length,2);assert.equal(temporary.sessionOnly,true);
});
test('native recommendation code matches the tested source',async()=>{
 for(const name of ['quiet-feelings.js','quiet-diary.js'])assert.equal(await readFile(new URL('../shared/'+name,import.meta.url),'utf8'),await readFile(new URL('../mobile/src/generated/'+name,import.meta.url),'utf8'));
});
