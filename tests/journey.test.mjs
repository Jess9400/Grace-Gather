import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ACTIONS,PATHS,FLOW_COPY,journeyPath,journeyPassages} from '../dist/journey.js';
import {MOODS,selectPassages} from '../dist/core.js';
const {editions}=JSON.parse(await readFile(new URL('../dist/scripture.json',import.meta.url)));

test('Sadness and world-weariness lead to different relevant actions',()=>{
  assert.deepEqual(journeyPath('sad').actions,['sadPrayer','gentleWalk','tellSomeone']);
  assert.deepEqual(journeyPath('hopeless').actions,['goodNews','smallGood','visitElders']);
  assert.notDeepEqual(journeyPath('lonely').actions,journeyPath('anxious').actions);
  assert.equal(journeyPath('hopeless').theme,'hope');
});
test('All available editions offer a direct sadness passage, preserving exact source text',()=>{
  for(const edition of editions){
    const prefs={scriptureLanguage:edition.language,tradition:edition.traditions[0],edition:edition.id};
    const verses=journeyPassages(selectPassages(editions,prefs,'sad'),'sad');
    assert.ok(verses[0].situations.includes('sad'),edition.id);
    assert.equal(verses[0].text,edition.passages.find(p=>p.id===verses[0].id).text);
    assert.equal(verses.length,2);
    assert.ok(verses.every(p=>p.theme==='rest'));
  }
});
test('A path excludes unrelated passages and preserves unavailable editions',()=>{
  for(const edition of editions)for(const mood of MOODS){
    const prefs={scriptureLanguage:edition.language,tradition:edition.traditions[0],edition:edition.id};
    const verses=journeyPassages(selectPassages(editions,prefs,mood),mood);
    assert.ok(verses.length>0&&verses.length<=2);
    assert.ok(verses.every(p=>p.theme===journeyPath(mood).theme));
  }
  assert.deepEqual(journeyPassages([],'sad'),[]);
});
test('Every branch and action is usable in all four languages',()=>{
  assert.deepEqual(Object.keys(PATHS).sort(),[...MOODS].sort());
  for(const copy of Object.values(FLOW_COPY)){
    assert.deepEqual(Object.keys(copy),Object.keys(FLOW_COPY.en));
    for(const path of Object.values(PATHS)){
      assert.ok(copy[path.label]&&copy[path.reflection]);
      assert.ok(path.actions.length>=3);
      for(const id of path.actions){
        assert.ok(ACTIONS[id]);
        assert.ok(copy[id]&&copy[id+'Desc']&&copy[id+'Body']&&copy[ACTIONS[id].time]);
        if(ACTIONS[id].url){assert.match(ACTIONS[id].url,/^https:\/\//);assert.ok(copy[ACTIONS[id].link]);}
      }
    }
  }
});
test('The preview never claims to have interpreted journal text or scheduled a session',()=>{
  assert.match(FLOW_COPY.en.previewExplanation,/not connected yet/);
  assert.match(FLOW_COPY.en.basedFeeling,/you selected/);
  assert.match(FLOW_COPY.en.weeklySessionNote,/No sessions are scheduled/);
  assert.match(FLOW_COPY.en.goodNewsBody,/not a verified/);
  assert.equal(journeyPath('untrusted-input'),PATHS.unsure);
});
