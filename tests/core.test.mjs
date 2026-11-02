import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizePrefs, compatibleEditions, selectPassages, needsHumanSupport, escapeHTML, isValidEntry, DEFAULT_PREFS, MOODS, THEMES} from '../dist/core.js';
import {COPY, REFLECTIONS} from '../dist/content.js';
const {editions}=JSON.parse(await readFile(new URL('../dist/scripture.json',import.meta.url)));

test('Every advertised edition has five independently sourced, unique passages',()=>{
  assert.equal(editions.length,6);
  for(const e of editions){
    assert.equal(e.passages.length,5);
    assert.equal(new Set(e.passages.map(p=>p.id)).size,5);
    assert.equal(new Set(e.passages.map(p=>p.theme)).size,5);
    assert.ok(e.attribution&&e.license&&e.scope&&e.canon);
    for(const p of e.passages){assert.ok(p.text.length>20);assert.match(p.sourceUrl,/^https:\/\//);assert.ok(p.reference);for(const lang of ['en','pt','es','ru'])assert.ok(p.context[lang]);}
  }
});
test('All tradition/language combinations either match precisely or return an honest empty selection',()=>{
  for(const tradition of ['protestant','catholic','orthodox'])for(const scriptureLanguage of ['en','pt','es','ru']){
    const p=normalizePrefs({tradition,scriptureLanguage},editions);
    const result=selectPassages(editions,p,'grateful');
    const available=compatibleEditions(editions,p);
    assert.equal(result.length,available.length?5:0);
    for(const passage of result){assert.equal(passage.language,scriptureLanguage);assert.equal(passage.tradition,tradition);}
  }
});
test('Catholic Portuguese never silently substitutes a Protestant or English edition',()=>{
  const p=normalizePrefs({language:'pt',scriptureLanguage:'pt',tradition:'catholic',edition:'blivre'},editions);
  assert.equal(p.edition,'');assert.deepEqual(selectPassages(editions,p,'sad'),[]);
});
test('Interface and scripture language remain independent',()=>{
  const p=normalizePrefs({...DEFAULT_PREFS,language:'ru'},editions);
  assert.equal(p.language,'ru');assert.equal(p.scriptureLanguage,'en');assert.equal(p.edition,'web');
});
test('Every feeling prioritizes the intended passage theme without rewriting the quotation',()=>{
  for(const e of editions)for(const mood of MOODS){
    const p={scriptureLanguage:e.language,tradition:e.traditions[0],edition:e.id};
    const selected=selectPassages(editions,p,mood);
    assert.equal(selected[0].theme,THEMES[mood]);
    assert.equal(selected[0].text,e.passages.find(x=>x.id===selected[0].id).text);
  }
});
test('Septuagint numbering and edition metadata survive the entry snapshot',()=>{
  const p=normalizePrefs({tradition:'orthodox'},editions);
  const selected=selectPassages(editions,p,'sad');
  assert.equal(selected[0].reference,'Psalm 22:2 (Septuagint)');
  assert.match(selected[0].editionName,/Old Testament/);
  const snapshot=JSON.parse(JSON.stringify(selected));p.tradition='catholic';
  assert.equal(snapshot[0].editionId,'brenton');
});
test('All four languages have complete non-empty UI copy and reflection copy',()=>{
  const keys=Object.keys(COPY.en).sort();
  for(const language of ['en','pt','es','ru']){assert.deepEqual(Object.keys(COPY[language]).sort(),keys);for(const value of Object.values(COPY[language]))assert.ok(value?.length);}
  for(const value of Object.values(REFLECTIONS)){assert.equal(value.length,4);assert.ok(value.every(Boolean));}
});
test('Local safety gate catches explicit examples across four languages',()=>{
  for(const s of ['I want to kill myself','I want to end my life','quero me matar','penso em suicídio','quiero quitarme la vida','quiero suicidarme','хочу покончить с собой','хочу умереть'])assert.equal(needsHumanSupport(s),true,s);
  for(const s of ['I feel grateful today','Estou com saudade','Me siento solo','Мне грустно'])assert.equal(needsHumanSupport(s),false,s);
});
test('Journal text renders as text, including HTML-like content',()=>{
  assert.equal(escapeHTML('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHTML("O'Brien & friends"),'O&#39;Brien &amp; friends');
});
test('Empty check-ins are rejected; text, mood, or audio alone is enough',()=>{
  assert.equal(isValidEntry('   ','',null),false);
  assert.equal(isValidEntry('A thought','',null),true);
  assert.equal(isValidEntry('','sad',null),true);
  assert.equal(isValidEntry('','',new Blob(['audio'])),true);
  assert.equal(isValidEntry('','',new Blob([])),false);
});
test('Corrupted or outdated preferences normalize to valid values',()=>{
  const p=normalizePrefs({language:'xx',scriptureLanguage:'xx',tradition:'unknown',edition:'missing'},editions);
  assert.deepEqual(p,DEFAULT_PREFS);
});
