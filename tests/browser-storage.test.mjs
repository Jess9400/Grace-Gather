import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { createWebVault } from '../mobile/src/lib/web-vault.ts';
const { createClient } = createRequire(new URL('../mobile/package.json', import.meta.url))('@supabase/supabase-js');

const open = (factory) => new Promise((resolve, reject) => {
  const request = factory.open('grace-and-gather-vault-v1');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const access = (db, store, mode, operation) => new Promise((resolve, reject) => {
  const tx = db.transaction(store, mode);
  const request = operation(tx.objectStore(store));
  tx.oncomplete = () => resolve(request?.result);
  tx.onabort = () => reject(tx.error);
});

test('browser profile, journal and login email survive reopening and stay encrypted at rest', async () => {
  const factory = new IDBFactory();
  const first = createWebVault(factory, webcrypto);
  const profile = JSON.stringify({ name: 'Preview reader', language: 'pt', city: 'São Paulo' });
  const entries = JSON.stringify([{ text: 'Um momento de paz. Спасибо.' }]);
  await first.setItem('profile', profile);
  await first.setItem('entries', entries);
  await first.setItem('auth-email', 'preview@example.com');
  await first.close();
  const second = createWebVault(factory, webcrypto);
  assert.equal(await second.getItem('profile'), profile);
  assert.equal(await second.getItem('entries'), entries);
  assert.equal(await second.getItem('auth-email'), 'preview@example.com');
  const db = await open(factory);
  const row = await access(db, 'values', 'readonly', (s) => s.get('entries'));
  assert.equal(new TextDecoder().decode(row.data).includes('momento'), false);
  const key = await access(db, 'keys', 'readonly', (s) => s.get('journal'));
  assert.equal(key.extractable, false);
  await assert.rejects(webcrypto.subtle.exportKey('raw', key));
  db.close();
  await second.close();
});

test('concurrent browser tabs choose one key and refuse records copied under another name', async () => {
  const factory = new IDBFactory();
  const first = createWebVault(factory, webcrypto), second = createWebVault(factory, webcrypto);
  await Promise.all([first.setItem('profile', 'profile-data'), second.setItem('entries', 'journal-data')]);
  assert.equal(await second.getItem('profile'), 'profile-data');
  assert.equal(await first.getItem('entries'), 'journal-data');
  const db = await open(factory);
  const entry = await access(db, 'values', 'readonly', (s) => s.get('entries'));
  await access(db, 'values', 'readwrite', (s) => s.put(entry, 'profile'));
  await assert.rejects(first.getItem('profile'));
  assert.equal(await second.getItem('entries'), 'journal-data');
  db.close();
  await Promise.all([first.close(), second.close()]);
});

test('missing encryption key fails without replacing it or deleting the journal', async () => {
  const factory = new IDBFactory();
  const first = createWebVault(factory, webcrypto);
  await first.setItem('entries', 'saved journal');
  await first.close();
  const db = await open(factory);
  await access(db, 'keys', 'readwrite', (s) => s.clear());
  const second = createWebVault(factory, webcrypto);
  await assert.rejects(second.initialize());
  assert.equal(await access(db, 'values', 'readonly', (s) => s.count()), 1);
  assert.equal(await access(db, 'keys', 'readonly', (s) => s.count()), 0);
  db.close();
});

test('clear removes all saved app data while the vault remains usable', async () => {
  const factory = new IDBFactory(), vault = createWebVault(factory, webcrypto);
  await vault.setItem('profile', 'old profile');
  await vault.setItem('auth-email', 'preview@example.com');
  await vault.clearVault();
  assert.equal(await vault.getItem('profile'), null);
  assert.equal(await vault.getItem('auth-email'), null);
  await vault.setItem('profile', 'new profile');
  await vault.close();
  const reopened = createWebVault(factory, webcrypto);
  assert.equal(await reopened.getItem('profile'), 'new profile');
  await reopened.close();
});

test('Supabase restores a stored session in a fresh client and sign-out stays signed out', async () => {
  // Synthetic session only; requests use a stub and never reach production.
  const factory = new IDBFactory();
  const first = createWebVault(factory, webcrypto);
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = { access_token: `${encode({ alg:'HS256' })}.${encode({ sub:'test-reader', exp })}.test`, refresh_token:'test-refresh', token_type:'bearer', expires_at:exp, expires_in:3600, user:{ id:'test-reader', email:'preview@example.com' } };
  await first.setItem('sb-example-auth-token', JSON.stringify(session));
  await first.setItem('profile', 'local profile');
  await first.close();
  const second = createWebVault(factory, webcrypto);
  const requests = [];
  const clientFor = (storage) => createClient('https://example.supabase.co', 'test-publishable-key', {
    auth: { storage, persistSession:true, autoRefreshToken:false, detectSessionInUrl:false },
    global: { fetch: async (url) => { requests.push(String(url)); return new Response('{}', { status:200, headers:{ 'Content-Type':'application/json' } }); } },
  });
  const client = clientFor(second);
  assert.equal((await client.auth.getSession()).data.session.user.id, 'test-reader');
  assert.deepEqual(requests, []);
  assert.equal((await client.auth.signOut({ scope:'local' })).error, null);
  assert.equal(await second.getItem('sb-example-auth-token'), null);
  assert.equal(await second.getItem('profile'), 'local profile');
  await second.close();
  const third = createWebVault(factory, webcrypto);
  assert.equal((await clientFor(third).auth.getSession()).data.session, null);
  await third.close();
});
