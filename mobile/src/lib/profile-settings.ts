import type { Profile } from "./content";

/** Account data never changes the separately-managed journal permissions. */
export function profileSettings(profile: Profile) {
  const {
    journalAIConsentVersion: _consent,
    deleteJournalChatsAfter90Days: _cleanup,
    ...settings
  } = profile;
  return settings;
}
