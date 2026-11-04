import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const module = { exports: {} };
const source = readFileSync(
  new URL("../src/lib/discussion-model.ts", import.meta.url),
  "utf8",
);
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module, exports: module.exports },
);
const {
  initialDiscussions,
  discussionReducer: act,
  visibleTopics,
  canReadPost,
  verseKey,
} = module.exports;
test("new topics and replies remain pending until explicit demo approval", () => {
  let state = initialDiscussions();
  state = act(state, {
    type: "topic",
    title: "An honest question",
    body: "What does this passage mean?",
    perspective: "Open discussion",
    verseId: "web:GEN.1.3",
  });
  const pending = state.topics[0];
  assert.equal(pending.author, "you");
  assert.equal(pending.status, "pending");
  assert.equal(
    visibleTopics(state).some((t) => t.id === pending.id),
    false,
  );
  state = act(state, { type: "review", postId: pending.id, approve: true });
  assert.equal(
    visibleTopics(state).some((t) => t.id === pending.id),
    true,
  );
  state = act(state, {
    type: "reply",
    topicId: pending.id,
    body: "Thank you",
    perspective: "Open discussion",
  });
  assert.equal(canReadPost(state, state.topics[0].replies[0]), false);
  state = act(state, {
    type: "review",
    postId: state.topics[0].replies[0].id,
    approve: false,
  });
  assert.equal(state.topics[0].replies[0].status, "removed");
});
test("reports hide content locally, resolution restores or removes it", () => {
  let state = initialDiscussions();
  state = act(state, {
    type: "report",
    postId: "light-reply",
    reason: "Personal information",
  });
  assert.equal(state.reports.length, 1);
  assert.equal(canReadPost(state, state.topics[0].replies[0]), false);
  state = act(state, {
    type: "resolve",
    reportId: state.reports[0].id,
    remove: false,
  });
  assert.equal(canReadPost(state, state.topics[0].replies[0]), true);
  state = act(state, { type: "report", postId: "light", reason: "Harassment" });
  state = act(state, {
    type: "resolve",
    reportId: state.reports[1].id,
    remove: true,
  });
  assert.equal(
    visibleTopics(state).some((t) => t.id === "light"),
    false,
  );
});
test("blocking hides author topics and replies and can be undone", () => {
  let state = initialDiscussions();
  state = act(state, { type: "block", author: "sample-anna" });
  assert.equal(
    visibleTopics(state).some((t) => t.id === "light"),
    false,
  );
  state = act(state, { type: "unblock", author: "sample-anna" });
  state = act(state, { type: "block", author: "sample-michael" });
  assert.equal(
    visibleTopics(state).some((t) => t.id === "light"),
    true,
  );
  assert.equal(canReadPost(state, state.topics[0].replies[0]), false);
});
test("verse links keep exact collection IDs, including different Psalm numbering", () => {
  assert.notEqual(verseKey("brenton:PSA.22.1"), verseKey("web:PSA.22.1"));
  const state = initialDiscussions();
  assert.equal(visibleTopics(state, "web:GEN.1.3").length, 1);
  assert.equal(visibleTopics(state, "brenton:GEN.1.3").length, 0);
});
test("empty or oversized submissions and unknown reply targets do not mutate state", () => {
  const state = initialDiscussions();
  for (const action of [
    { type: "topic", title: " ", body: "Text", perspective: "Open discussion" },
    {
      type: "topic",
      title: "Title",
      body: "x".repeat(2001),
      perspective: "Open discussion",
    },
    {
      type: "reply",
      topicId: "missing",
      body: "Hello",
      perspective: "Open discussion",
    },
    { type: "report", postId: "missing", reason: "Spam" },
  ])
    assert.equal(act(state, action), state);
});
