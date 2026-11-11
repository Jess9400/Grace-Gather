// Avoid punctuation that can trigger asset/URL normalization on web hosts.
// Stored IDs and discussion references remain unchanged.
export function verseRouteId(id: string) {
  return id.replace(
    /^([a-z]+):([A-Z0-9]{3})\.(\d+)\.(\d+[a-z]?)$/,
    "$1--$2-$3-$4",
  );
}

export function verseIdFromRoute(id: string) {
  return id.replace(
    /^([a-z]+)--([A-Z0-9]{3})-(\d+)-(\d+[a-z]?)$/,
    "$1:$2.$3.$4",
  );
}
