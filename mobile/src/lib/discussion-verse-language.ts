/** Only map references that use the same numbering in the supported editions. */
export function discussionVerseForLanguage(
  sourceId: string | undefined,
  editionId: string | undefined,
  passages: readonly { id: string; verse?: string }[],
  hasCompleteReader: boolean,
) {
  const code = sourceId?.match(/^(?:[^:]+:)?([A-Z0-9]{3}\.\d+\.\d+[a-z]?)$/)?.[1];
  // Old Testament editions can use different numbering. Without a verified
  // cross-edition mapping, retain the original rather than guess.
  const newTestament = /^(MAT|MRK|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)\./;
  if (!code || !editionId || !newTestament.test(code)) return null;
  const curated = passages.find((passage) => passage.verse === code);
  if (curated) return curated.id;
  return hasCompleteReader ? `${editionId}:${code}` : null;
}
