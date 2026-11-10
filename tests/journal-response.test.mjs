import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';

// Execute the mobile resolver against the shipped translation assets, rather
// than mocking verses (which hid the edition-numbering regression).
const cache = new Map();
function load(path) {
  let file = resolve(path);
  if (!existsSync(file)) file += existsSync(file + '.ts') ? '.ts' : '.js';
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
  if (file.endsWith('/gatherings.ts')) return { gathering: async () => [] };
  if (file.endsWith('/discover.ts')) return { storyText: (v, lang) => typeof v === 'string' ? v : v[lang] ?? '' };
  if (file.endsWith('/church-calendar.ts')) return { welcomesCandles: p => p.candlePractice ?? p.tradition !== 'protestant' };
  const module = { exports: {} }; cache.set(file, module.exports);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(id => load(resolve(dirname(file), id)), module, module.exports);
  return module.exports;
}
const { data } = load('mobile/src/lib/content.ts');
const { resolveJournalResponse } = load('mobile/src/lib/journal-response.ts');
const { journalActionCopy, displayedJournalInvitation, actionInvitation } = load('mobile/src/lib/journal-copy.ts');
const { journalTheme } = load('mobile/src/lib/journal-guidance.ts');
const { journalVerseId } = load('mobile/src/lib/journal-verse-reference.ts');
const themes = load('mobile/src/generated/journal-map.json');
const prefs = edition => ({ language: edition.language, scriptureLanguage: edition.language, edition: edition.id, tradition: edition.traditions[0] });
const entry = (preferences, changes = {}) => ({ id: 'synthetic-journal', createdAt: '2026-11-10T00:00:00Z', text: 'God, lately I feel distant from You.', mood: 'unsure', prefs: preferences, safety: false, themeId: 'doubt', suggestedAction: 'A03', ...changes });

const doubtIds = { web: 'web:PSA.13.1', dra: 'dra:PSA.12.1', brenton: 'brenton:PSA.12.2', blivre: 'blivre:PSA.13.1', rv1909: 'rv1909:PSA.13.1', synodal: 'synodal:PSA.12.2' };
for (const edition of data.editions) {
  test(`spiritual distance keeps the spreadsheet Psalm in ${edition.id}`, async () => {
    const p = prefs(edition), response = await resolveJournalResponse(entry(p), p);
    assert.ok(response.verse?.text);
    if (doubtIds[edition.id]) assert.equal(response.verse.id, doubtIds[edition.id]);
    else assert.equal(edition.journalVerses.find(v => v.id === response.verse.id)?.verse, 'PSA.13.1');
    assert.ok(response.verse.sourceUrl);
    assert.ok(response.verse.licenseUrl);
    assert.equal(response.actionId, 'A03');
    if (edition.language === 'en') {
      assert.match(response.verse.text, /how long/i);
      assert.equal(response.actionTitle, 'Begin an honest prayer');
      assert.match(response.actionPrompt, /distance you feel/);
      assert.doesNotMatch(response.invitation + response.actionTitle, /worr|anxi/i);
    }
  });
}

test('all mapped Psalms resolve in every full-reader edition without a generic mood fallback', async () => {
  for (const edition of data.editions.filter(e => doubtIds[e.id])) {
    const p = prefs(edition);
    for (const theme of themes.filter(t => t.verse.startsWith('PSA.'))) {
      const response = await resolveJournalResponse(entry(p, { themeId: theme.id }), p);
      assert.equal(response.verse?.id, journalVerseId(edition.id, theme.verse), `${edition.id} ${theme.id}`);
      assert.ok(response.verse.text.length > 20, `${edition.id} ${theme.id} empty`);
    }
  }
  assert.equal(journalVerseId('dra', 'PSA.20.1'), null, 'Unknown Psalm correspondence must not be guessed');
});

test('saved originals are stable when opened or followed by a chat', async () => {
  const p = prefs(data.editions[0]);
  const saved = await resolveJournalResponse(entry(p), p);
  const reopened = await resolveJournalResponse(entry(p, { response: saved, themeId: 'gratitude', conversation: [{ role: 'user', content: 'A different thought.' }] }), p);
  assert.equal(reopened, saved);
});

test('one prayer action carries different, localized prompts for different needs', () => {
  for (const lang of ['en', 'pt', 'es', 'ru']) {
    const copies = ['doubt', 'anxiety', 'sadness', 'illness', 'betrayal', 'hopelessness'].map(theme => journalActionCopy(lang, theme, 'A03'));
    assert.equal(new Set(copies.map(c => c.title)).size, 6);
    assert.equal(new Set(copies.map(c => c.prompt)).size, 6);
    assert.ok(copies.every(c => c.invitation && c.prompt));
  }
  assert.equal(journalActionCopy('en', 'unclear', 'A03').title, 'Take a minute with God');
  assert.equal(journalActionCopy('en', 'hopelessness', 'A08').title, 'Notice one small good thing');
});

test('local matching understands prayer addressed to God and preserves saved model choices', () => {
  const p = prefs(data.editions[0]);
  for (const text of ['God, I feel distant from You.', 'I feel disconnected from God.', 'I want to feel closer to You.', 'Deus, me sinto longe de Ti.', 'Dios, me siento lejos de ti.', 'Боже, я чувствую себя далеко от Тебя.']) {
    assert.equal(journalTheme(entry(p, { text, themeId: undefined })).id, 'doubt', text);
  }
  for (const text of ['I no longer feel distant from God.', 'I do not feel disconnected from God.', 'I have no doubts today.']) {
    assert.notEqual(journalTheme(entry(p, { text, themeId: undefined })).id, 'doubt', text);
  }
  assert.equal(journalTheme(entry(p, { text: 'I do not know why God feels far away.', themeId: undefined })).id, 'doubt');
  assert.equal(journalTheme(entry(p, { themeId: 'grief' })).id, 'grief');
});

test('immediate support does not acquire a verse-led response', async () => {
  const p = prefs(data.editions[0]);
  assert.equal((await resolveJournalResponse(entry(p, { safety: true }), p)).verse, null);
});


test('a saved or new gathering action falls back when no session can be verified', async () => {
 const p = prefs(data.editions[0]);
 const item = entry(p, { text: 'I have no one to talk to', themeId:'lonely', suggestedAction:'A25' });
 const fresh = await resolveJournalResponse(item, p);
 assert.equal(fresh.actionId,'A04');
 assert.equal(fresh.actionTitle,'Share what is on your heart');
 const stored = {...fresh, actionId:'A25', actionTitle:'Explore gatherings'};
 const reopened = await resolveJournalResponse({...item,response:stored},p);
 assert.equal(reopened.actionId,'A04');
 assert.equal(stored.actionId,'A25');
});


test('confession invitation explains the listener and preserves personal saved wording', () => {
 for (const lang of ['en','pt','es','ru']) {
  const updated = journalActionCopy(lang, 'venting', 'A04').invitation;
  assert.notEqual(updated, actionInvitation(lang, 'A04'));
  assert.equal(displayedJournalInvitation(lang, 'venting', 'A04', actionInvitation(lang, 'A04')), updated);
  assert.equal(displayedJournalInvitation(lang, 'venting', 'A04', 'My personal wording'), 'My personal wording');
 }
 assert.match(journalActionCopy('en', 'venting', 'A04').invitation, /Confession room/);
 assert.match(journalActionCopy('en', 'venting', 'A04').invitation, /may respond/);
});
