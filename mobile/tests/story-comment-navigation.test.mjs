import test from 'node:test';
import assert from 'node:assert/strict';
import { commentsReadyForJump } from '../src/lib/story-comment-navigation.js';

const publisher = { item: { id: 'a', origin: 'publisher' }, id: 'a', loading: false, inlinePublisher: false, publisherFinished: '', publisherRetry: 0 };
test('comments wait until the full publisher article settles', () => {
  assert.equal(commentsReadyForJump(publisher), false);
  assert.equal(commentsReadyForJump({ ...publisher, publisherFinished: 'a:0' }), true);
  assert.equal(commentsReadyForJump({ ...publisher, publisherFinished: 'a:0', publisherRetry: 1 }), false);
});
test('a prior story never triggers a jump for a newly selected story', () => {
  assert.equal(commentsReadyForJump({ ...publisher, id: 'b', inlinePublisher: true }), false);
  assert.equal(commentsReadyForJump({ ...publisher, item: { id: 'a', origin: 'community' } }), true);
  assert.equal(commentsReadyForJump({ ...publisher, item: { id: 'a', origin: 'community' }, loading: true }), false);
});
