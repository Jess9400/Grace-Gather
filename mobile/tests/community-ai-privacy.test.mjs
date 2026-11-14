import {test} from 'node:test';
import assert from 'node:assert/strict';
import {privateCommunityCandidate} from '../../supabase/functions/_shared/community-ai-privacy.js';

test('automated review never includes another person’s context or a private report',()=>{
  const post={id:'one',title:'title',body:'body',perspective:'open',context:'another person’s words',report:'private report'};
  assert.deepEqual(privateCommunityCandidate(post),{id:'one',title:'title',body:'body',perspective:'open'});
});
