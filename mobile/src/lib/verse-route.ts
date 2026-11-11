// Verse ids name their Bible, e.g. "web:GEN.1.1". A ":" in a web address is
// redirected by the host until the browser gives up, so verse links use "~"
// in the address instead ("/verse/web~GEN.1.1") and the verse page reads both.
export function toVerseRoute(id: string) {
  return id.replace(":", "~");
}
export function fromVerseRoute(route: string) {
  return route.replace("~", ":");
}
