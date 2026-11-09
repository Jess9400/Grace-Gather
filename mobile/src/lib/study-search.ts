// Transfer a search to the study screen without putting the question in a URL.
let pending = "";
export function setStudySearch(value: string) {
  pending = value.trim().slice(0, 200);
}
export function getStudySearch() {
  return pending;
}
