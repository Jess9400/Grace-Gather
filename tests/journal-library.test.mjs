import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';
const require = createRequire(import.meta.url), cache = new Map();
function load(path) {
  const file = resolve(path);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
  const module = {exports:{}}; cache.set(file,module.exports);
  const code = ts.transpileModule(readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id => id.startsWith('.') ? load(resolve(dirname(file), id + (id.endsWith('.json') || id.endsWith('.ts') ? '' : '.ts'))) : require(id), module, module.exports);
  return module.exports;
}
const retention = load('mobile/src/lib/journal-retention.ts');
const backup = load('mobile/src/lib/journal-backup.ts');
const crypto = load('mobile/src/lib/journal-backup-crypto.ts');
const exported = load('mobile/src/lib/journal-export.ts');
const NOW = Date.parse('2026-11-10T12:00:00Z'), DAY = retention.DAY;
const prefs = {language:'en',scriptureLanguage:'en',tradition:'protestant',edition:'web'};
const entry = (changes = {}) => ({id:'entry-one', createdAt:'2026-07-01T12:00:00Z', text:'A moment of hope.\nAnother paragraph.', mood:'hopeful',safety:false,prefs,
  response:{verse:{id:'web:ROM.15.13',text:'A verified verse.',reference:'Romans 15:13',editionName:'World English Bible',attribution:'Public domain',licenseUrl:'https://example.com/license'},actionId:'A08',actionTitle:'Notice one small good thing',invitation:'Something small may help.'},
  conversation:[{id:'question-one',role:'user',content:'What might help?'},{id:'reply-one',role:'assistant',content:'Try a quiet moment.',actionId:'A02'}], ...changes});
const payload = (entries = [entry()]) => ({version:1,rows:[{key:'entries',value:JSON.stringify(entries)}],audio:{}});

test('archive uses three calendar months with month-end clamping and never mutates entries', () => {
  assert.equal(new Date(retention.archiveCutoff(Date.parse('2024-05-31T12:00:00Z'))).toISOString(),'2024-02-29T12:00:00.000Z');
  assert.equal(retention.isArchived(entry(),NOW),true);
  assert.equal(retention.isArchived(entry({createdAt:'2026-10-01T12:00:00Z'}),NOW),false);
  const entries = [entry()];
  assert.deepEqual(retention.applyJournalRetention(entries,false,NOW).entries,entries);
});
test('old chats get a new seven-day warning, not immediate deletion when cleanup is enabled', () => {
  const result = retention.applyJournalRetention([entry()],true,NOW).entries[0];
  assert.equal(Date.parse(result.chatCleanup.deleteAt),NOW+7*DAY);
  assert.equal(result.chatCleanup.seenAt,undefined);
  assert.equal(result.conversation.length,2);
  const unseen = retention.applyJournalRetention([result],true,NOW+30*DAY).entries[0];
  assert.equal(unseen.conversation.length,2);
  const seen = retention.acknowledgeCleanup(unseen,NOW+30*DAY);
  assert.equal(Date.parse(seen.chatCleanup.deleteAt),NOW+37*DAY);
});
test('cleanup waits for both the scheduled date and the visible notice grace period', () => {
  const warned = retention.acknowledgeCleanup(retention.applyJournalRetention([entry()],true,NOW).entries[0],NOW);
  assert.equal(retention.applyJournalRetention([warned],true,NOW+7*DAY-1).entries[0].conversation.length,2);
  const cleaned = retention.applyJournalRetention([warned],true,NOW+7*DAY).entries[0];
  assert.deepEqual(cleaned.conversation,[]);
  assert.equal(cleaned.deletedConversations[0].messages.length,2);
  for (const field of ['id','text','createdAt','response','prefs']) assert.deepEqual(cleaned[field],warned[field]);
  assert.equal(retention.applyJournalRetention([cleaned],true,NOW+8*DAY).entries[0].deletedConversations.length,1);
});
test('keep, opt-out, invalid dates, and new messages cannot be silently deleted', () => {
  const warned = retention.acknowledgeCleanup(retention.applyJournalRetention([entry()],true,NOW).entries[0],NOW);
  for (const [item,enabled] of [[{...warned,keepConversation:true},true],[warned,false]]) {
    const safe = retention.applyJournalRetention([item],enabled,NOW+10*DAY).entries[0];
    assert.equal(safe.conversation.length,2);assert.equal(safe.chatCleanup,undefined);
  }
  assert.equal(retention.applyJournalRetention([entry({createdAt:'invalid'})],true,NOW).entries[0].chatCleanup,undefined);
  assert.equal(retention.applyJournalRetention([entry({conversationUpdatedAt:new Date(NOW).toISOString()})],true,NOW).entries[0].chatCleanup,undefined);
});
test('deleted conversations recover with all messages and stay exempt from automatic cleanup', () => {
  const removed = retention.deleteConversation(entry(),NOW);
  const recovered = retention.restoreConversation({...removed, conversation:[{id:'new-message',role:'user',content:'A new thought.'}]},removed.deletedConversations[0].id);
  assert.equal(recovered.conversation.length,3);
  assert.equal(recovered.keepConversation,true);
  assert.deepEqual(recovered.deletedConversations,[]);
  assert.equal(recovered.response.actionTitle,'Notice one small good thing');
});
test('30-day recovery expires only deleted content; whole-entry audio is removed only after that window', () => {
  const chat = retention.deleteConversation(entry(),NOW);
  assert.equal(retention.applyJournalRetention([chat],false,NOW+30*DAY-1).entries[0].deletedConversations.length,1);
  const expired = retention.applyJournalRetention([chat],false,NOW+30*DAY).entries[0];
  assert.deepEqual(expired.deletedConversations,[]);assert.equal(expired.text,chat.text);
  const removed = entry({deletedAt:new Date(NOW).toISOString(),audio:'recording-one'});
  assert.equal(retention.applyJournalRetention([removed],false,NOW+29*DAY).entries.length,1);
  const after = retention.applyJournalRetention([removed],false,NOW+30*DAY);
  assert.deepEqual(after.entries,[]);assert.deepEqual(after.removedAudio,['recording-one']);
});
test('date selection includes both boundary dates, excludes trash, and honors conversation export choices', () => {
  const entries = [entry({id:'before',createdAt:'2026-06-30T12:00:00Z'}),entry(),entry({id:'after',createdAt:'2026-07-02T12:00:00Z'}),entry({id:'deleted',deletedAt:new Date(NOW).toISOString()})];
  const selected = exported.selectJournalExport(entries,{from:'2026-07-01',to:'2026-07-01',includeConversations:false});
  assert.deepEqual(selected.map(e=>e.id),['entry-one']);assert.equal(selected[0].conversation,undefined);
  assert.equal(selected[0].response.actionId,'A08');assert.equal(entries[1].conversation.length,2);
  assert.equal(exported.validDateRange('2026-02-30',''),false);assert.equal(exported.validDateRange('2026-12-01','2026-01-01'),false);
});
test('a removed conversation can be exported explicitly without exposing other deleted conversations', () => {
  const removed = retention.deleteConversation(entry(),NOW);
  const selected = exported.selectJournalExport([removed],{from:'',to:'',includeConversations:true,entryId:removed.id,deletedChatId:removed.deletedConversations[0].id});
  assert.equal(selected[0].conversation.length,2);assert.equal(selected[0].deletedConversations,undefined);
});
test('PDF HTML preserves paragraphs and Unicode, escapes user markup, and has no external font or script requests', () => {
  const html = exported.journalExportHtml([entry({text:'Obrigado. Спасибо.\n<script>alert(1)</script>'})],'pt');
  assert.ok(html.includes('Obrigado. Спасибо.\n&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('Notice one small good thing'));assert.ok(html.includes('What might help?'));
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('@import'));
  assert.ok(html.includes('break-before: page'));assert.ok(html.includes('white-space: pre-wrap'));
});
test('encrypted backup round-trips entry, saved verse, action and chat; wrong keys and tampering fail', async () => {
  const original = payload([entry({text:'My private words. Спасибо.'})]);
  const result = await crypto.sealBackup(original,webcrypto);
  assert.equal(result.key.length,64);assert.equal(new TextDecoder().decode(result.bytes).includes('private words'),false);
  assert.deepEqual(await crypto.unsealBackup(result.bytes,result.key,webcrypto),original);
  await assert.rejects(crypto.unsealBackup(result.bytes,'0'.repeat(64),webcrypto));
  const tampered = result.bytes.slice();tampered[15]^=1;
  await assert.rejects(crypto.unsealBackup(tampered,result.key,webcrypto));
});
test('restore merges missing entries and preserves existing entries and profile without overwriting', () => {
  const current = entry({text:'Keep my newer wording.'});
  const merged = backup.mergeBackup(payload([entry(),entry({id:'second-entry'})]),[current],{...prefs,onboarded:true});
  const entries = JSON.parse(merged.rows.find(r=>r.key==='entries').value);
  assert.equal(entries.length,2);assert.equal(entries.find(e=>e.id===current.id).text,current.text);
  assert.equal(entries.find(e=>e.id==='second-entry').keepConversation,true);
  assert.equal(merged.rows.some(r=>r.key==='profile'),false);
});
test('restore rejects auth rows, missing recordings, duplicate IDs and malformed conversation data', () => {
  for (const bad of [
    {...payload(),rows:[...payload().rows,{key:'auth-token',value:'"secret"'}]},
    payload([entry({audio:'missing-file'})]),payload([entry(),entry()]),
    payload([entry({conversation:[{role:'system',id:'x',content:'not a valid saved message'}]})]),
    payload([entry({deletedConversations:[{id:'x',deletedAt:'invalid',messages:[]}]})]),
  ]) assert.throws(()=>backup.decodeBackup(JSON.stringify(bad)));
});


test('a stale writing save preserves concurrently deleted chats, Keep and newer replies', () => {
  const old = entry();
  const removed = {...retention.deleteConversation(old,NOW),keepConversation:true};
  const updated = retention.mergeJournalWriting(removed,{...old,text:'An intentional edit.',reflection:'A small kindness.'});
  assert.equal(updated.text,'An intentional edit.');
  assert.deepEqual(updated.conversation,[]);
  assert.deepEqual(updated.deletedConversations,removed.deletedConversations);
  assert.equal(updated.keepConversation,true);
  assert.deepEqual(updated.response,old.response);
  const withReply={...old,conversation:[...old.conversation,{id:'latest',role:'assistant',content:'A newer reply.'}],conversationUpdatedAt:new Date(NOW).toISOString()};
  const saved = retention.mergeJournalWriting(withReply,{...old,reflection:'Saved from an older page.'});
  assert.equal(saved.conversation.at(-1).id,'latest');
  assert.equal(saved.conversationUpdatedAt,withReply.conversationUpdatedAt);
});
