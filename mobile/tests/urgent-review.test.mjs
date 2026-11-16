import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsPriorityReview, priorityReviewCount } from '../src/lib/urgent-review.js';

test('only pending safety signals get priority, without treating routine or resolved content as urgent', () => {
  assert.equal(needsPriorityReview({status:'pending', signals:['safety_context']}), true);
  assert.equal(needsPriorityReview({status:'reported', signals:['threat']}), true);
  assert.equal(needsPriorityReview({status:'pending', signals:['audio_review']}), false);
  assert.equal(needsPriorityReview({status:'approved', signals:['threat']}), false);
  assert.equal(priorityReviewCount([{status:'pending',signals:['threat']}, {status:'pending',signals:[]}]), 1);
  assert.equal(needsPriorityReview({id:'a',status:'reported',signals:[]}, [{target:'a',reason:'danger'}]), true);
  assert.equal(needsPriorityReview({id:'a',status:'reported',signals:[]}, [{target:'a',reason:'other'}]), true);
  assert.equal(needsPriorityReview({id:'b',status:'reported',signals:[]}, [{target:'a',reason:'danger'}]), false);
  assert.equal(priorityReviewCount([{id:'a',status:'reported',signals:['threat']}], [{target:'a',reason:'danger'}]), 1);
});
