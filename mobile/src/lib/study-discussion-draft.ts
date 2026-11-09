// Explicit Study -> Community handoff stays in memory, never in a URL or storage.
let topic = "";
let revision = 0;
export const getStudyDiscussionRevision = () => revision;
export function setStudyDiscussionTopic(value: string) {
  revision++;
  topic = value.trim().slice(0, 100);
}
export function getStudyDiscussionTopic() {
  return topic;
}
export function clearStudyDiscussionTopic() {
  topic = "";
}
