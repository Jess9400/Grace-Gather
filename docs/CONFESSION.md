# Confession room

Navigation: Journal, Explore, Bible Study (the existing `learn` route), Confession, Gatherings. Four interface languages remain available. Private journal content is never submitted to this service.

## Visibility and timing

A signed-in author explicitly consents before sharing text or optional audio. All submissions and comfort replies start pending, including text without flagged words. Only authorized moderators see pending content. The list contains themes and requested response types, never body text or account identifiers.

Opening a reviewed confession atomically reserves it for one listener for six hours. Reopening the same reservation never extends it. The database excludes active reservations and automatically includes expired unanswered ones in list queries; no scheduler or open browser is needed. Another listener may read the confession after expiry. The original listener cannot send a late response once the reservation expires. Closing a confession prevents a pending listener from replying.

One database-unique response per confession, including a response held for review. After submission it leaves the matching list permanently. The approved reply is visible only to its writer, listener, and authorized moderators. The author can send a private predefined thank-you, close replies, report, block, and delete their confession and associated response. No public counts, names, likes, social profiles, or unlimited direct messages.

Audio is optional, never autoplayed, and has a local playback preview. “Share as text instead” excludes the recording from submission and explains that transcription is not connected. Upload limit: 5 MB; web recording stops at 90 seconds. A name hidden from listeners does not make a voice or identifiable narrative anonymous. Web audio is stored in private R2 and every playback request rechecks access. Native media uses a private Supabase bucket and short-lived authorized playback URLs; these expire in 60 seconds. This is not end-to-end encrypted community content or sacramental confession.

## Review workflow

Sign in as the configured moderator and open Confession → Moderation room. On the private Site, the user selected `023logistica@gmail.com`; that allowlist is stored as a runtime secret. Native deployments use verified email allowlisting or the existing moderator/admin role. Never grant access based on an email submitted in a profile form. Reviewers cannot approve their own content.

Read context and listen to all audio before approving. Disclosure, grief, quotations, and historical experiences are not equivalent to a threat. The lightweight local rules prioritize possible safety concerns (including obfuscated terms in English, Portuguese, Spanish, and Russian), identifying/contact information, and shaming responses. Rules do not diagnose intent or provide comprehensive detection. Every item remains hidden until a person decides, even when screening misses a signal. Do not approve content unsuitable for peer support, coercion, threats, identifying information, or harmful advice. Record the reason for each decision. Sensitive text is not written into audit logs. Reports immediately hide content for review and protect reporter identity in community responses. Audit logs track review access and decisions.

KeepMe's `docs/MODERATION.md` and classifier were reviewed as a design reference: contextual signals, fail-closed delivery, reporting, and human decisions. Grace & Gather does not claim to inherit KeepMe's measured classifier performance, staffing, alerting, legal procedures, or review deadlines.

There is no real-time on-call monitoring or automatic crisis intervention. Review operations, trained staffing, escalation procedures, retention/deletion processes, and launch suitability still require the owner’s setup. The UI promises neither immediate replies nor emergency response. No LLM moderation service has been connected. The mobile backend must be deployed before community functions become active in an iOS build.

## Deployment

Sites uses the appended Drizzle migration, DB binding, private BUCKET binding, and `CONFESSION_MODERATOR_EMAILS` runtime secret. Preserve Site access settings. The allowlist is configured in this task; the owner still needs to sign in and review submissions.

For the native backend apply `202611030005_confession.sql`, deploy `confessions` and the updated `account-delete` Edge Functions, and configure `CONFESSION_MODERATOR_EMAILS` in Supabase. `scripts/sync-mobile-content.mjs` copies the shared service/policy into the Edge Function folder. The service-role-only RPC is inaccessible to app users, as are the underlying tables. Supabase credentials are never bundled except the existing public project key. Existing authentication verifies bearer tokens server-side. Account deletion removes uploaded confession recordings before deleting related rows.

The local preview and unit tests use disposable fixtures only. They are not included in migrations or the published community. Run `npm test`, `npm run check`, and mobile `typecheck`, `lint`, and `export` after edits. Tests cover SQLite and PostgreSQL authorization, reservation expiry, concurrent claims/replies, review holds, reporting and privacy.
