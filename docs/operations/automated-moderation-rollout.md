# Automated moderation rollout

This change must be reviewed and tested before enabling it. The new confession and editorial screening and the scheduled recheck are disabled by default. Never place credentials in source control or logs.

## What changes

- Confessions and comfort replies may be approved immediately only when the author permits community AI and has explicitly opted in for the individual submission. Audio additionally needs permission to send the recording for transcription. Otherwise they remain in the existing human review queue.
- With community AI permission, new testimonies, story comments and eligible Pay It Forward submissions are screened before publication. Charity submissions with an external website remain in human review: a model cannot verify the organization or its links. Existing discussion and prayer screening continue to use their current workflows.
- A scheduled worker checks consenting, published items approximately six hours after publication. It checks the backlog every five minutes. This is one follow-up per publication, not a repeated scan of every historical item every six hours; a later moderation approval schedules a new check. Older audio and confessions without submission-specific permission are skipped. Reports remain available for human review at any time.
- If an initial screening is unavailable, uncertain, or unsafe, the item stays pending. If a follow-up finds a concern, or repeatedly cannot complete, the item is hidden pending review; it is not deleted. AI can miss harmful speech and transcription can be inaccurate. Keep human moderation and reporting enabled.

## Deployment prerequisites

1. Reconcile the remote migration history. Apply only these reviewed migrations in order: `20261115184855_confession_auto_moderation`, `20261115185242_text_content_auto_moderation`, and `20261115191219_moderation_safety_recheck`. Do not use an unqualified database push against an unreconciled project. Check the existing moderation and notification triggers and service-role grants first.
2. Deploy `confessions`, `content-moderate` and `moderation-recheck`, with the matching `supabase/config.toml` settings. Confirm that the existing Qwen credentials are available and that `qwen-audio-3.1-asr-flash` is available on the configured Alibaba account and supports the recordings produced by the app. Confirm current cost and retention settings. Avoid recording text, transcripts, audio, model responses, and credentials in logs.
3. The worker requires a random token of at least 32 characters. Store it as the `MODERATION_RECHECK_TOKEN` function secret, and store the same value as `moderation_recheck_token` in Supabase Vault. Store the exact project function URL as `moderation_recheck_url` in Vault. The scheduler does nothing until both Vault entries exist. Configure tokens through secure administrative tools; never paste them into a PR, chat or logs.
4. Release the client and privacy wording before enabling the relevant flags. Voice screening needs the updated submission-specific consent UI, so an iPhone app update is required for that UI in TestFlight.
5. After deployment checks, enable `CONFESSION_AUTO_MODERATION_ENABLED`, `CONTENT_AUTO_MODERATION_ENABLED`, and `MODERATION_RECHECK_ENABLED` explicitly. A flag must equal `true`; leaving it unset keeps that component off.

## Verification with synthetic content

- Confirm new text and audio confessions with the required permission are either approved after a safe result or appear in the staff queue on uncertainty, model failure, unsupported audio, missing permission, or a provider outage. Verify the actual account and model with a synthetic recording; unit tests mock the provider.
- Check opted-in submissions and replies for discussions, prayers, testimonies, story comments and Pay It Forward, and check that external charity links go to human review. Verify reports and moderator push alerts with two different test accounts.
- Exercise a due six-hour job with synthetic content: safe stays visible, uncertain or repeated failures go to human review, and edits, revoked permission, and existing human decisions cannot be overwritten by a stale result. Verify jobs and failures by status and counts without accessing private content.
- Monitor provider usage, queue age, errors, and push delivery. Test the dashboard separately with a different moderator account. Never approve an author's own submission to bypass a self-review restriction.

To pause processing, turn off the feature flags and verify that new items remain in human review. The scheduled job can also be disabled using the Supabase scheduler; retain pending records and the moderation audit trail.
