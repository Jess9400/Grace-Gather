import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript');
const cache = new Map();
function load(path) {
  if (!extname(path)) path += existsSync(path + '.ts') ? '.ts' : existsSync(path + '.js') ? '.js' : '.json';
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) module.exports = JSON.parse(source);
  else runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: name => name.startsWith('.') ? load(resolve(dirname(path), name)) : require(name) }, { filename: path });
  return module.exports;
}
const { journalTheme, says } = load(resolve(root, 'mobile/src/lib/journal-guidance.ts'));
// The backup reader, used when the AI is off or unavailable; the entry's
// own feeling (mood) only decides when no words match.
const theme = (text, mood = 'unsure') => journalTheme({ text, mood }).id;

test('keywords match whole words, not pieces of other words', () => {
  assert.equal(theme('I miss my parents so much', 'sad'), 'sadness');
  assert.equal(theme('I studied all night for my exam', 'anxious'), 'anxiety');
  assert.equal(theme('Today felt different, lighter', 'peaceful'), 'peace');
  assert.equal(theme('My current job is fine but I feel empty', 'sad'), 'sadness');
  assert.equal(theme("I'm worried my son is in danger at school", 'anxious'), 'anxiety');
  assert.equal(theme('The hospitality at church today was lovely', 'peaceful'), 'peace');
  assert.equal(theme('Desculpa, hoje estou só cansada', 'unsure'), 'unclear');
});

test('the words still find their themes', () => {
  assert.equal(theme("I can't pay the rent this month"), 'money');
  assert.equal(theme('My father died last night'), 'grief');
  assert.equal(theme('Mom is in the hospital again'), 'illness');
  assert.equal(theme("I'm so angry at my brother"), 'anger');
  assert.equal(theme('I regret what I said to her'), 'guilt');
  assert.equal(theme('Perdi o emprego e não tenho dinheiro'), 'money');
  assert.equal(theme('Mi abuela murió ayer'), 'grief');
  assert.equal(theme('Мама в больнице'), 'illness');
  assert.equal(theme('Я злюсь на себя'), 'anger');
  assert.equal(theme('Estou esgotada'), 'exhaustion');
  assert.equal(theme('Thank you for this beautiful day'), 'gratitude');
});

test('"not" cancels a feeling, but not a need', () => {
  assert.equal(theme("I'm not angry anymore, just tired of waiting", 'peaceful'), 'peace');
  assert.equal(theme("I don't feel guilty, I feel sad", 'sad'), 'sadness');
  assert.equal(theme('Я не виноват, но мне грустно', 'sad'), 'sadness');
  assert.equal(theme('No estoy enojado, estoy triste', 'sad'), 'sadness');
  assert.equal(theme('Não estou com raiva, só triste', 'sad'), 'sadness');
  // Still the feeling when "never" or "can't" only make it stronger.
  assert.equal(theme("I've never been so angry"), 'anger');
  assert.equal(theme("I can't stop being angry"), 'anger');
  // Lacking money is still money.
  assert.equal(theme('I have no money for food'), 'money');
  assert.equal(theme('У меня нет денег'), 'money');
});

test('says() matches from the start of a word', () => {
  assert.equal(says('parents', 'rent\\b'), false);
  assert.equal(says('the rent is due', 'rent\\b'), true);
  assert.equal(says('hospitality', 'hospital(?!it)'), false);
  assert.equal(says('hospitalized', 'hospital(?!it)'), true);
  assert.equal(says('я не виноват', 'винов', true), false);
  assert.equal(says('я виновата', 'винов', true), true);
});
