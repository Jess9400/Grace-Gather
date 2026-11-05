import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
for(const id of ['blivre','rv1909','synodal'])test(`${id}: publisher snapshot has complete chapter coverage, unique verses and preserved rights`,()=>{
 const base=`mobile/src/generated/bible-${id}/`,index=read(base+'index.json');
 assert.equal(index.books.length,66);
 assert.match(index.sourceSha256,/^[a-f0-9]{64}$/);
 assert.ok(readFileSync(new URL('../'+base+'publisher-rights.html',import.meta.url),'utf8').length>100);
 let total=0;
 for(const meta of index.books){
  const book=read(base+meta.code+'.json');
  assert.deepEqual(Object.keys(book.chapters),Array.from({length:meta.chapters},(_,i)=>String(i+1)));
  const verses=Object.values(book.chapters).flat();total+=verses.length;
  assert.equal(verses.length,meta.verses);
  assert.equal(new Set(verses.map(v=>v.id)).size,verses.length);
  assert.ok(verses.every(v=>v.text||v.notes.length));
 }
 assert.ok(total>31000);
});
test('USFX parsing preserves word spacing and punctuation even outside paragraphs, and keeps notes separate',()=>{
 const output=execFileSync('python3',['-c',`
import importlib.util,xml.etree.ElementTree as E,json
s=importlib.util.spec_from_file_location('reader','scripts/import-bible-collections.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
b=E.fromstring('<book><c id="1"/><v id="1"/><w>First</w> <w>word</w>; <w>last</w>.<f><ft>Publisher note</ft></f><ve/></book>')
print(json.dumps(m.parse_book(b,'GEN',include_book_tails=True)))
`],{encoding:'utf8'});
 const v=JSON.parse(output)['1'][0];assert.equal(v.text,'First word; last.');assert.deepEqual(v.notes,['Publisher note']);
});
