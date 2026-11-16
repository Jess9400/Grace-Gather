// A continuation may use private journal data only after the account-specific
// permission has actually been saved. A failed save must leave the draft alone.
export async function saveJournalPermissionThenContinue(profile, version, saveProfile, onAllowed) {
  const next = { ...profile, journalAIConsentVersion: version };
  await saveProfile(next);
  onAllowed(next);
}
