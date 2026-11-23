import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recommendations, reflectionIssue, REFLECTION_EXAMPLES, REFLECTION_GUIDE } from '../supabase/functions/_shared/journey-policy.js';
const catalog = JSON.parse(await readFile(new URL('../supabase/functions/_shared/journey-catalog.json',import.meta.url)));
const preferences={language:'en',scriptureLanguage:'en',tradition:'protestant',edition:catalog.editions.find(e=>e.language==='en'&&e.traditions.includes('protestant')).id};

test('the example replies the AI learns from pass the reply rules themselves', () => {
  assert.ok(REFLECTION_EXAMPLES.length >= 10);
  for (const [, reply] of REFLECTION_EXAMPLES) assert.equal(reflectionIssue(reply), undefined, reply);
  assert.match(REFLECTION_GUIDE, /under 280 characters/);
});

test('machine-sounding phrases, questions and dashes are not shown', () => {
  for (const reply of [
    'It sounds like you are carrying a lot.',
    "It's completely understandable to feel this way.",
    "Remember that you're not alone on this journey.",
    'Consider taking a moment for self-care.',
    'How are you feeling now?',
    'A long day — rest now.',
  ]) assert.equal(reflectionIssue(reply), 'generic', reply);
  assert.equal(reflectionIssue(''), 'missing');
  assert.equal(reflectionIssue('Visit https://example.com'), 'format');
  assert.equal(reflectionIssue('x'.repeat(321)), 'format');
  // The owner's own voice stays allowed.
  assert.equal(reflectionIssue("It's okay to be worried. We need to remember that worrying won't help her."), undefined);
});

test('a clean reflection reaches English replies only', () => {
  const value = {path:'anxious',support:false,reflection:'  You saw his face, and it stayed with you.  '};
  assert.equal(recommendations(value,preferences,catalog).reflection,'You saw his face, and it stayed with you.');
  assert.equal(recommendations({...value,reflection:'I hear you.'},preferences,catalog).reflection,undefined);
  const ru=catalog.editions.find(e=>e.language==='ru');
  assert.equal(recommendations(value,{...preferences,language:'ru',scriptureLanguage:'ru',edition:ru.id,tradition:ru.traditions[0]},catalog).reflection,undefined);
});
