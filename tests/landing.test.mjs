import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../landing/public/', import.meta.url).pathname;
const page = readFileSync(root + 'index.html', 'utf8');

test('the landing page has every picture and file it points to', () => {
  const local = [...page.matchAll(/(?:src|href)="([^"#:]+\.(?:jpg|png))"/g)].map((m) => m[1]);
  assert.ok(local.length >= 8);
  for (const file of new Set(local)) assert.ok(existsSync(root + file), file);
  assert.ok(existsSync(root + 'share-card.png'));
});

test('the landing page leads to the app and gives the right contact address', () => {
  const app = [...page.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]).filter((url) => !url.includes('fonts.g'));
  assert.ok(app.length >= 3);
  for (const url of app) assert.match(url, /^https:\/\/(grace-gather\.findflockie\.workers\.dev|graceandgather\.online)\//, url);
  assert.match(page, /hello@graceandgather\.online/);
  assert.doesNotMatch(page, /graceandgather\.com/);
});

test('the walk has its three moments and one main heading', () => {
  assert.equal((page.match(/class="moment"/g) || []).length, 3);
  assert.equal((page.match(/<h1[ >]/g) || []).length, 1);
  assert.match(page, /A church away from church/);
  // People who ask for less motion get a still scene.
  assert.match(page, /prefers-reduced-motion/);
});
