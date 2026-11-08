// Explicit Study -> Community handoff stays in memory, never in a URL or storage.
let topic = "";
export function setStudyDiscussionTopic(value: string) {
  topic = value.trim().slice(0, 100);
}
export function getStudyDiscussionTopic() {
  return topic;
}
export function clearStudyDiscussionTopic() {
  topic = "";
}
