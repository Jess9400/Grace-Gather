import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
test('private rule catalogue reproduces bundled policy and exact Bible verse coverage',()=>{
 const files=['supabase/migrations/20261104200000_private_moderation_catalog.sql','mobile/src/generated/community-private-rules.json'];
 const before=files.map(file=>readFileSync(new URL(file,root),'utf8'));
 execFileSync(process.execPath,['scripts/build-community-private-rules.mjs'],{cwd:root});
 files.forEach((file,i)=>assert.equal(readFileSync(new URL(file,root),'utf8'),before[i]));
 const rules=JSON.parse(before[1]);
 for(const preset of rules.presets){assert.ok(rules.titles.includes(preset.title));assert.ok(rules.messages.includes(preset.body));}
 assert.ok(rules.aliases.includes('Member'));
});
test('Community moderation entry points cannot select the former external AI processor',()=>{
 for(const name of ['community-moderate','community-screen']){
  const source=readFileSync(new URL(`supabase/functions/${name}/index.ts`,root),'utf8');
  assert.doesNotMatch(source,/qwen|alibaba|dashscope|fetch\s*\(|Deno\.env|community_agent_(?:reserve|publish)/i);
  assert.match(source,/community_check_private/);
 }
 const client=readFileSync(new URL('mobile/src/lib/discussion-state.tsx',root),'utf8');
 assert.doesNotMatch(client,/functions\.invoke|COMMUNITY_AUTO_MODERATION/);
});
