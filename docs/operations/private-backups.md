# Grace & Gather: private backup plan

**Status: instructions only. No backup or automated schedule has been created.** The project is on Supabase Free, which does not include scheduled database backups. A backup must include sensitive member data, so choose an encrypted destination and restrict access before exporting anything. A backup is not a verified recovery plan until restoration has been tested in an isolated environment.

## Decide before taking a backup

1. Choose the destination and owner: an encrypted external drive or a properly protected encrypted cloud location with limited access. Confirm available space, who may access it, the backup interval, how long copies are retained, and how deletion requests will be handled. Do not use a shared folder, chat, email, or source control.
2. Keep the encryption recovery key separately from the backup, with a tested recovery process. Do not put passwords, database connection strings, access tokens, service keys, or encryption keys in source control, command history, logs, the backup archive, or chat. Verify encryption before transferring or storing any data.
3. Take a complete inventory before exporting. Supabase's CLI distinguishes schema, table data, and roles; a default schema dump alone is not a data backup and managed schemas may need special handling. Database dumps do not contain Storage files. Follow Supabase's current CLI backup/restore guidance for the installed CLI version and confirm the production target before any command.
4. Plan separately for the private `account-journal-audio`, `confession-audio` and `journal-backups` Storage buckets and other required buckets, their access policies and metadata. Use Storage APIs or supported tools, not SQL deletion or SQL-only copying. Account and authentication data, private schemas, functions, row-level policies, scheduled tasks, provider settings, edge-function code and separately managed secrets all need a documented restoration approach. Do not assume the database dump captures them.
5. If Vault or database encryption keys are in use, follow Supabase's recovery guidance before a project is lost: a database dump does not itself contain the project's encryption root key. Access and key handling require separate security review.

## First backup and verification

1. Export using a controlled process that encrypts data before it leaves the protected environment. Avoid producing unencrypted intermediate files; if any are unavoidable, use an encrypted volume with sufficient free space and a secure cleanup procedure. Do not print member data or credentials to logs.
2. Save a minimal manifest alongside the encrypted backup: creation time, source project and environment, component coverage, tool versions and encrypted-file checksums. The manifest must not contain members' personal information or secrets.
3. Confirm the backup can be decrypted and its checksums match. Restore only to an isolated test project, never into the live database. Verify journal entries with synthetic data, account access controls, private audio and other media, app functions and provider configuration. Record the test date and remaining gaps without inspecting real member journal content.
4. Define a routine to check that backups actually complete, alert a responsible person on failure, periodically test restoration, and delete expired copies securely. If a backup is restored, prevent resurrecting users or content deleted after it was made: maintain and apply a secure deletion record before reopening the restored service.

## Current references

- [Supabase backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase database backups and Storage limitation](https://supabase.com/docs/guides/platform/backups)
- [Supabase Storage object downloads](https://supabase.com/docs/guides/storage/management/download-objects)

Supabase Pro currently includes scheduled database backups, but that is a paid choice and does not by itself back up Storage files. This plan does not turn on Pro or create a new storage service.
