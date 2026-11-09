# Journal library and conversation retention

My Journal keeps the submitted entry, its selected Scripture text/edition, and its first action together. The original response is stored as a snapshot; later chat messages and recommendation updates do not replace it. Existing entries gain a snapshot when opened. Intentionally editing and resubmitting an entry selects a new response.

## Conversation and archive

Replies stay inside the entry screen, with a matching ivory action button beneath each actionable AI reply. A saved conversation is collapsed on reopening and expands when sending. At ten exchanges, earlier exchanges fold separately while the newest two remain inline; expanding older messages uses a bounded scroll area without discarding messages. The existing limit of 40 messages (20 exchanges) remains.

Entries older than three calendar months appear in Archive. This is a view, not a deletion or storage move. Recent, Archive and Recently deleted are searchable and paginated.

## Optional cleanup

“Delete AI conversations after 90 days” is off unless the user saves that preference. The clock uses the last message timestamp, falling back to the entry date for legacy conversations.

- An in-app notice appears before cleanup, with the scheduled date, Keep and Export.
- Cleanup cannot run before the entry-specific notice and date have been displayed and a full seven-day grace period has elapsed. Returning after a long absence starts a fresh grace period.
- Keep exempts that conversation. New messages clear the scheduled cleanup; disabling cleanup cancels it.
- Removed conversations enter Recently deleted for 30 days. Their original entry, verse and first action remain.
- Explicitly deleted entries also have 30 days of recovery. Only expired, previously deleted entries lose their recordings.
- Restoring a chat or importing a backup preserves its conversation and exempts it from automatic cleanup.

All evaluation runs on launch, foreground and once a minute while the app is open, using encrypted local storage. There is no server job, push notification or email containing journal information. A global in-app banner and the notification screen link to review. On browsers without Web Locks, automatic cleanup is disabled to avoid concurrent destructive writes.

## Export and restore

My Journal → Export accepts an inclusive date range (blank means all dates) and a conversation checkbox. PDF export creates a readable, **unencrypted** copy; recordings are not embedded. Native uses Expo Print plus the share sheet; web opens a local print document for the browser’s Save as PDF destination. No remote rendering service or external font request is used.

Encrypted backups use the existing version-1 payload and AES-256-GCM combined format (12-byte IV, ciphertext, 16-byte tag), plus a separately retained 64-character recovery key. Native and browser adapters share payload validation. Backups include selected entries, optional conversations, preferences and associated recordings; they exclude authentication tokens. Native audio can be preserved through browser backup/restore but browser recording/playback remains unavailable.

Restore validates the entire payload before writing and adds missing entry IDs without replacing existing entries. Existing onboarded preferences win. Missing legacy course rows are retained for compatibility. Browser rows and recordings commit in one IndexedDB transaction; native row updates are transactional and new recording files are rolled back on failure. Wrong keys, corrupt files and incomplete recording payloads fail without replacing the journal.

This remains device/browser-local storage, not Supabase journal synchronization. Browser site-data removal can erase its local vault; a downloaded encrypted backup and recovery key are the portable recovery mechanism. The browser key protects data at rest, not an unlocked browser or same-origin malicious scripts.

## Verification

Pure policy/backup tests cover archive boundaries, seven-day notification grace, opt-out, Keep, recovery expiry, action/verse preservation, date filters, HTML escaping, Unicode, AES tampering, wrong keys and merge-without-overwrite. Browser storage tests cover encrypted persistence and atomic rollback. The isolated browser flow was checked with synthetic entries: restore, archive, chat deletion/recovery, range selection, encrypted download and long conversation collapse. A four-page HTML export was saved through Chrome as PDF, rendered and visually checked.

A new native development build is required for the added Expo Print module. Native print/share, recording and keyboard behavior still need device smoke testing before an App Store release.
