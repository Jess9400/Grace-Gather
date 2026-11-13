// Score the journal's AI theme picker on the test library, outside the app.
// It sends each test entry to the AI with exactly the instructions the live
// journal service uses (read from supabase/functions/llm-journey/index.ts),
// so nothing counts against anyone's daily allowance in the app.
//
// usage, from the repository root:
//   DASHSCOPE_API_KEY=... node scripts/journal-eval/eval-ai.mjs [--limit 40]
// Optional: QWEN_MODEL (default qwen-flash), QWEN_BASE_URL.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = process.env.REPO_ROOT || resolve(here, '../..');
const fixtures = process.env.FIXTURES || resolve(repo, 'mobile/tests/fixtures/journal-entries');
const { ACTION_GUIDE } = await import(resolve(repo, 'supabase/functions/_shared/journey-policy.js'));
const map = JSON.parse(readFileSync(resolve(repo, 'supabase/functions/_shared/journal-map.json'), 'utf8'));
const source = readFileSync(resolve(repo, 'supabase/functions/llm-journey/index.ts'), 'utf8');
// The theme-picking instructions are the system message beginning "You select ONE theme".
const start = source.indexOf('`You select ONE theme');
const end = source.indexOf('`}', start + 1);
if (start < 0 || end < 0) throw Error('Could not find the theme instructions in llm-journey/index.ts');
const template = source.slice(start + 1, end);
const prompt = (preferences) =>
  new Function('ACTION_GUIDE', 'input', 'payload', 'map', 'return `' + template + '`;')(
    ACTION_GUIDE, { preferences }, { supportsConnectedActions: true }, map);

const key = process.env.DASHSCOPE_API_KEY || process.env.alibaba_api_key;
if (!key) throw Error('Set DASHSCOPE_API_KEY to the same key the journal service uses.');
const base = (process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
const model = process.env.QWEN_MODEL || 'qwen-flash';
const limitAt = process.argv.indexOf('--limit');
const limit = limitAt > 0 ? Number(process.argv[limitAt + 1]) : Infinity;
const tradition = { en: 'protestant', pt: 'catholic', es: 'catholic', ru: 'orthodox' };

const entries = ['en', 'pt', 'es', 'ru']
  .flatMap((l) => existsSync(resolve(fixtures, `${l}.json`)) ? JSON.parse(readFileSync(resolve(fixtures, `${l}.json`), 'utf8')) : [])
  .slice(0, limit);
const rows = [];
for (const [i, e] of entries.entries()) {
  const preferences = { language: e.lang, scriptureLanguage: e.lang, tradition: tradition[e.lang], edition: '', candlePractice: true };
  let got = null, error = null;
  try {
    const response = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, enable_thinking: false, max_tokens: 420, temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: prompt(preferences) }, { role: 'user', content: e.text }],
      }),
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const content = (await response.json()).choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    got = parsed.support ? 'support' : parsed.themeId;
  } catch (err) {
    error = String(err.message || err);
  }
  const verdict = error ? 'error' : got === e.expect ? 'right' : (e.also ?? []).includes(got) ? 'fair' : 'wrong';
  rows.push({ id: e.id, lang: e.lang, text: e.text, expect: e.expect, also: e.also, got, verdict, error });
  process.stdout.write(`\r${i + 1}/${entries.length}`);
  await new Promise((r) => setTimeout(r, 400));
}
const n = rows.length, count = (v) => rows.filter((r) => r.verdict === v).length;
console.log(`\nAI picker (${model}): ${n} entries: ${count('right')} right, ${count('fair')} fair, ${count('wrong')} wrong, ${count('error')} errors`);
for (const r of rows.filter((r) => r.verdict === 'wrong')) console.log(`  ${r.id}: expected ${r.expect}, got ${r.got}  "${r.text.slice(0, 80)}"`);
const out = resolve(process.cwd(), 'journal-ai-scorecard.json');
writeFileSync(out, JSON.stringify(rows, null, 1));
console.log('Saved ' + out + '. It contains only the test entries, never real journals.');
