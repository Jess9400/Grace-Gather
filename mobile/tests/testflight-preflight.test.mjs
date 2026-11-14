import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const script = new URL('../scripts/preflight.mjs', import.meta.url);
const required = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
  EXPO_PUBLIC_EAS_PROJECT_ID: 'test-project',
  APPLE_BUNDLE_ID: 'com.example.test',
};
const run = (env) => spawnSync(process.execPath,[script.pathname,'--if-release'], {encoding:'utf8',env:{PATH:process.env.PATH,...env}});

test('testflight profile requires backend configuration and an approved app identity', () => {
  const missing = run({TESTFLIGHT_BUILD:'true'});
  assert.equal(missing.status,1);
  assert.match(missing.stderr,/EXPO_PUBLIC_SUPABASE_URL/);
  const fallback = run({...required,TESTFLIGHT_BUILD:'true',APPLE_BUNDLE_ID:'com.awaychurch.preview'});
  assert.equal(fallback.status,1);
  assert.match(fallback.stderr,/production bundle identifier/);
  assert.equal(run({...required,TESTFLIGHT_BUILD:'true'}).status,0);
});

test('an App Store release cannot bypass release checks by setting the TestFlight flag', () => {
  const result=run({...required,TESTFLIGHT_BUILD:'true',RELEASE_BUILD:'true'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/privacyPolicyReviewed/);
});

test('TestFlight profile targets the existing app and keeps the production release gate separate', () => {
  const eas=JSON.parse(readFileSync(new URL('../eas.json',import.meta.url),'utf8'));
  assert.equal(eas.build.testflight.distribution,'store');
  assert.equal(eas.build.testflight.environment,'preview');
  assert.equal(eas.build.testflight.env.APPLE_BUNDLE_ID,'com.graceandgather.ios');
  assert.equal(eas.build.testflight.env.TESTFLIGHT_BUILD,'true');
  assert.equal(eas.build.production.env.RELEASE_BUILD,'true');
  assert.equal(eas.submit.testflight.ios.ascAppId,'6833897169');
});
