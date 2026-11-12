import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript');
const source = readFileSync(root + 'src/lib/safety.ts', 'utf8');
const module = { exports: {} };
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports });
const { needsSupport } = module.exports;

test('the journal recognises common ways of saying someone may be in danger, in four languages', () => {
  for (const text of [
    'I want to die.', "I don't want to live anymore", 'I don’t want to wake up tomorrow', 'everyone would be better off dead without me', 'I want to end my life', 'thinking about self-harm again',
    'Quero acabar com a minha vida.', 'eu quero morrer', 'Não quero mais viver', 'vou me matar',
    'Quiero morir', 'quiero acabar con mi vida', 'no quiero seguir vivir así', 'pienso en suicidarme',
    'Не хочу жить', 'хочу покончить с жизнью', 'думаю о самоубийстве',
  ]) assert.equal(needsSupport(text), true, text);
});

test('ordinary hard days do not trigger the danger card', () => {
  for (const text of [
    'I am tired and sad today.', 'I feel hopeless about my exam.', 'My dad died three weeks ago.', 'I want to live closer to God.',
    'Estou triste e cansada.', 'Meu pai morreu.', 'Quero viver melhor.',
    'Estoy muy cansado.', 'Mi madre murió el año pasado.',
    'Мне грустно.', 'Хочу жить ближе к Богу.',
  ]) assert.equal(needsSupport(text), false, text);
});
