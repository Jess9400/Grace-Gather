// The web never shows the walk by itself (it stays a preview at /intro), so
// it always counts as seen there. Phones use intro-seen-store.native.ts.
export async function readIntroSeen(_account: string) {
  return true;
}
export async function writeIntroSeen(_account: string) {}
