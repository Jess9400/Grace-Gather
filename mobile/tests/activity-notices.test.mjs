import test from 'node:test';
import assert from 'node:assert/strict';
import { activityDestination, groupUnreadActivity } from '../src/lib/activity-notices.ts';

test('read notices are hidden and unread replies for one destination form a single card', () => {
  const groups = groupUnreadActivity([
    { id: 'old', kind: 'discussion_reply', target: 'one', is_read: true },
    { id: 'new-1', kind: 'discussion_reply', target: 'one', is_read: false },
    { id: 'new-2', kind: 'discussion_reply', target: 'one', is_read: false },
    { id: 'other', kind: 'discussion_reply', target: 'two', is_read: false },
    { id: 'thanks', kind: 'confession_thanks', target: 'one', is_read: false },
  ]);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0].ids, ['new-1', 'new-2']);
  assert.deepEqual(groups[1].ids, ['other']);
  assert.deepEqual(groups[2].ids, ['thanks']);
});

test('activity opens the actual discussion or the relevant private confession item', () => {
  assert.deepEqual(activityDestination({ kind: 'discussion_reply', target: 'topic-1' }),
    { pathname: '/friends', params: { topic: 'topic-1', from: 'discover' } });
  for (const kind of ['confession_reply', 'confession_thanks']) {
    assert.deepEqual(activityDestination({ kind, target: 'item-1' }),
      { pathname: '/confession', params: { view: 'detail', item: 'item-1' } });
  }
});
