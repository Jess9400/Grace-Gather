import test from 'node:test';
import assert from 'node:assert/strict';
import { quietMood } from '../shared/quiet-diary.js';
import { detectFeelings } from '../shared/quiet-feelings.js';

// Real-sounding diary lines in each language, including negations.
const cases = [
 ['pt','Hoje estou muito triste, chorei a tarde toda.','sad'],
 ['pt','Estou ansiosa com a entrevista de amanhã, não paro de me preocupar.','anxious'],
 ['pt','Me sinto tão sozinho desde que me mudei.','lonely'],
 ['pt','Que dia maravilhoso! Estou tão feliz.','grateful'],
 ['pt','Sou muito grata pelas pessoas que me ajudaram.','grateful'],
 ['pt','Estou exausto, não aguento mais tanta coisa.','overwhelmed'],
 ['pt','Não estou triste hoje, só pensativo.','unsure'],
 ['pt','Estou sem esperança, nada vai mudar.','hopeless'],
 ['pt','Pela primeira vez em meses sinto esperança.','hopeful'],
 ['pt','Um dia tranquilo, estou em paz.','peaceful'],
 ['es','Estoy muy triste y lloré toda la noche.','sad'],
 ['es','Tengo mucha ansiedad por el examen.','anxious'],
 ['es','Me siento sola, nadie me llama.','lonely'],
 ['es','Estoy agobiado, no puedo más.','overwhelmed'],
 ['es','Ya no estoy preocupado.','unsure'],
 ['es','Estoy agradecido por mi familia.','grateful'],
 ['ru','Мне очень грустно, я весь день плачу.','sad'],
 ['ru','Я тревожусь и боюсь завтрашнего дня.','anxious'],
 ['ru','Я чувствую себя одиноким.','lonely'],
 ['ru','Я не грустный, просто устал.','overwhelmed'],
 ['ru','Нет надежды, ничего не изменится.','hopeless'],
 ['ru','Я так благодарна Богу за этот день.','grateful'],
 ['en','I am anxious about tomorrow.','anxious'],
 ['ru','anxious','unsure'],
];

test('feelings are recognised in Portuguese, Spanish and Russian, not only English', () => {
  for (const [language, text, mood] of cases) assert.equal(quietMood(text, {}, language), mood, `${language}: ${text}`);
});

test('"without hope" is hopelessness, never hope', () => {
  assert.equal(quietMood('Estou sem esperança', {}, 'pt'), 'hopeless');
  assert.equal(quietMood('Estoy sin esperanza', {}, 'es'), 'hopeless');
  assert.equal(quietMood('Нет надежды', {}, 'ru'), 'hopeless');
});

test('a language without a word list never invents a feeling', () => {
  assert.deepEqual(detectFeelings('triste', 'fr'), { primary: 'unsure', words: [] });
});

test('explicit choices still lead over writing', () => {
  assert.equal(quietMood('Estou muito triste', { grateful: 3 }, 'pt'), 'grateful');
});
