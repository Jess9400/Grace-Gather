# Security and release review · 10 November 2026

This is a bounded review of the live Supabase security-advisor findings and the associated repository functions, not a penetration test or release sign-off. The three branch migrations were subsequently reviewed and applied as described below; no Auth settings were changed.

The live advisor reported 22 authenticated SECURITY DEFINER warnings. These functions are intentionally callable application endpoints, so revoking all of them would break the app. Their authorization and data boundaries were inspected in the live function definitions:

- `community_check_private` and `community_delete` check ownership or moderator status; `community_review` and `community_resolve` check moderator status. `community_report` and `community_submit` check participation, readability and rate limits. `community_snapshot` checks authentication and applies per-post readability. `community_moderation_status` returns configuration status to signed-in callers.
- `post_comment` checks participation, published content and a rate limit; `report_content` requires a session and rate limits reports. `feed_stats` exposes aggregates for published items and excludes blocked comment authors.
- `pay_forward_list` returns approved recommendations; `pay_forward_review` checks staff role. The review found that `pay_forward_submit` checked sign-in and rate limits but did not check suspension; the new local migration adds the participation check.
- `prayer_command`, `prayer_snapshot`, and `prayer_unread` check participation and constrain ownership or staff actions. `raise_hand` updates only the caller's membership. `rsvp` removes only the caller's reservation or uses the checked reservation function. `moderate_user` checks staff and protects staff accounts. `participation_allowed` and `staff_role` report the caller's own status.

These observations do not prove every indirect helper or concurrency case safe. Existing community and new unread-message tests exercise important authorization boundaries, but an independent security review remains needed before distribution. RLS-enabled tables with no policies are deny-by-default for client roles; that is intentional only where direct access is revoked and should be rechecked against actual grants.

The advisor also reports compromised-password protection disabled. The app currently emphasizes email codes and Apple sign-in; verify which password-based Auth methods are actually enabled before changing a project-wide setting. Do not assume the warning proves password login is enabled or harmless.

The live migration history uses versions that differ from several older checked-in migration filenames. Reconcile using migration names, actual schema and deployment records before applying historical migrations; do not blindly push or rewrite live history. Group-chat tables exist although the matching checked-in version is not recorded in the listed live history. The discussion-search, message-read and Pay it forward guard migrations were applied individually on November 10, 2026; their checked-in versions match the live records.

## Operating moderation

- Assign named staff and a review schedule in the admin dashboard for held discussions, prayer requests, testimonies and confessions. Decide response-time targets and a backup reviewer before inviting a large audience.
- Discussions and prayer requests have automated screening with human review for uncertain or failed checks. Confessions have screening signals and a pending human-review workflow; testimonies have a review workflow. Do not describe these as the same fully automated system.
- Periodically check that the moderation provider, queues and notifications work, and rehearse provider outages. Do not publish held content solely because an automated service is unavailable.

## Still required before App Store distribution

Real-device checks remain: VoiceOver and large text, iPhone keyboard and focus, date/time controls including daylight-saving transitions, microphone permissions and interruptions, sign-in and account deletion, backup and restore, notifications, and a multi-person audio gathering. Complete the existing four-language, privacy, content-rights and release-checklist sign-offs. Neither a passing web preview nor unit tests substitutes for those checks.
