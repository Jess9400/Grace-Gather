import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from '../mobile/node_modules/typescript/lib/typescript.js';

const compile = (path, require) => {
  const context = createContext({ exports: {}, require });
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
};
const aiCopy = compile('../mobile/src/lib/ai-copy.ts');
const content = compile('../mobile/src/lib/content.ts', (id) => {
  if (id === './ai-copy') return aiCopy;
  if (id === '../generated/catalog.json') return JSON.parse(readFileSync(new URL('../mobile/src/generated/catalog.json', import.meta.url)));
  throw Error(id);
});

test('new profiles start with AI on; saved choices survive normalization and reopening', () => {
  const { initialProfile, normalizeProfile } = content;
  assert.equal(initialProfile.journalAIConsentVersion, aiCopy.AI_CONSENT_VERSION);
  assert.equal(normalizeProfile(JSON.parse(JSON.stringify(initialProfile))).journalAIConsentVersion, aiCopy.AI_CONSENT_VERSION);
  const optedOut = { ...initialProfile, journalAIConsentVersion: undefined, onboarded: true };
  assert.equal(normalizeProfile(JSON.parse(JSON.stringify(optedOut))).journalAIConsentVersion, undefined);
  const oldChoice = { ...initialProfile, journalAIConsentVersion: 'older-policy' };
  assert.equal(normalizeProfile(oldChoice).journalAIConsentVersion, 'older-policy');
});

test('disabling guidance blocks both journal and chat calls before contacting the backend', async () => {
  let authCalls = 0;
  const ai = compile('../mobile/src/lib/ai.ts', (id) => {
    if (id === './ai-copy') return aiCopy;
    if (id === './backend') return { requireUser: async () => { authCalls++; throw Error('unexpected_network'); } };
    if (id === './church-calendar') return { welcomesCandles: () => false };
    if (id === './llm-contract') return {};
    throw Error(id);
  });
  const off = { ...content.initialProfile, journalAIConsentVersion: undefined };
  await assert.rejects(ai.suggestJourney('A private entry', off), /consent_required/);
  await assert.rejects(ai.continueJournal({}, off, [], []), /consent_required/);
  assert.equal(authCalls, 0);
});
