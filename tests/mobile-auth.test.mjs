import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { authErrorKey, normalizeEmail, normalizeCode, validEmail, validCode, suggestedEmail, resendSeconds } from '../mobile/src/lib/auth-flow.ts';

test('email validation accepts aliases and international addresses without silently correcting domains', () => {
  assert.equal(normalizeEmail(' Person+journal@Example.com '), 'person+journal@example.com');
  for (const address of ['person+notes@example.com', 'человек@пример.рф', 'person@gmasil.com']) assert.equal(validEmail(address), true);
  for (const address of ['person@', 'person@@example.com', 'person@example', 'person name@example.com', 'person@example.com\nBcc: other@example.com']) assert.equal(validEmail(address), false);
  assert.equal(suggestedEmail('person@gmasil.com'), 'person@gmail.com');
  assert.equal(normalizeEmail('person@gmasil.com'), 'person@gmasil.com');
  assert.equal(suggestedEmail('person@my-own-domain.com'), '');
});

test('OTP validation supports current code lengths and pasted spacing, rejecting partial or altered values', () => {
  assert.equal(normalizeCode('1234 5678'), '12345678');
  for (const value of ['123456', '1234 5678', '1234567890']) assert.equal(validCode(value), true);
  for (const value of ['12345', '1234ab', '12-3456', '12345678901', '']) assert.equal(validCode(value), false);
});

test('resend cooldown rounds up and expires without negative countdowns', () => {
  assert.equal(resendSeconds(60000, 0), 60);
  assert.equal(resendSeconds(60000, 59001), 1);
  assert.equal(resendSeconds(60000, 60000), 0);
  assert.equal(resendSeconds(60000, 70000), 0);
});

test('auth failures select safe actionable copy without echoing provider details', () => {
  assert.equal(authErrorKey({ code: 'unexpected_failure', status: 500, message: 'SMTP credentials or private provider details' }, 'send'), 'authSendError');
  assert.equal(authErrorKey({ code: 'otp_expired' }, 'verify'), 'authInvalidCode');
  assert.equal(authErrorKey({ code: 'over_email_send_rate_limit' }, 'send'), 'authRateLimit');
  assert.equal(authErrorKey({ status: 429 }, 'verify'), 'authRateLimit');
  assert.equal(authErrorKey(new TypeError('Failed to fetch'), 'send'), 'authNetworkError');
  assert.equal(authErrorKey({ name: 'AuthRetryableFetchError', status: 0 }, 'send'), 'authNetworkError');
  assert.equal(authErrorKey({ name: 'AuthRetryableFetchError', status: 500 }, 'send'), 'authSendError');
  assert.equal(authErrorKey({ name: 'AuthRetryableFetchError', status: 503 }, 'verify'), 'authVerifyError');
  assert.equal(authErrorKey(null, 'verify'), 'authVerifyError');
});

test('all operational messages include four translations and matching placeholders', async () => {
  const copy = JSON.parse(await readFile(new URL('../mobile/src/lib/operation-copy.json', import.meta.url), 'utf8'));
  for (const [key, values] of Object.entries(copy)) {
    assert.equal(values.length, 4, key);
    const placeholders = (value) => [...value.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
    for (const value of values) {
      assert.ok(typeof value === 'string' && value.trim(), key);
      assert.deepEqual(placeholders(value), placeholders(values[0]), key);
    }
  }
});
