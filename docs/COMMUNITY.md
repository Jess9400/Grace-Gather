# Community deployment and moderation

Community uses the existing Supabase authentication and staff roles. It does not
reuse the Confession room's content, reservations, recordings or moderation queue.
Diary entries and the private profile tradition are never read by Community RPCs.
Members explicitly choose a public alias and optional conversation perspective.
The author value returned to the app is an opaque account UUID used for blocking,
not a name, email or profile record. Aliases are not unique or verified identities.

## Deploy

This change has not been deployed to a hosted project. A project administrator
must apply `20261104180000_community_discussions.sql` after existing migrations,
then verify the native app points to that project. Do not enable public posting
until real staff accounts exist in `private.staff`, staff can review reports,
and the two-account permission checks below pass against the hosted project.
Staff assignment is a privileged database operation, never a client setting.

All new posts and replies are pending. Only active existing staff can approve,
reject or resolve reports. Owners can permanently delete their own posts; deleting
a topic also deletes its replies. Account deletion uses existing auth cascades.
The private audit stores actions, actor IDs and post IDs without message bodies;
deleted accounts/posts null their audit identifiers. Submit/report activity counts
remain after post deletion to prevent rate-limit bypass and cascade on account
deletion. Operations may prune activity older than 30 days; audit retention needs
an explicit production retention policy before launch.

The API returns recent 30 public topics, the selected topic, and bounded recent
own submissions, staff pending submissions and report targets. Each thread adds
recent 100 published replies plus bounded own/pending/report targets. Reports
return at most 100 rows. These are bounded views, not a complete archive. Older
content needs a later pagination/search workflow; staff must monitor queue size.
Exact edition/verse IDs are preserved. No automatic Psalm numbering conversions
or cross-edition thread joins occur.

## Optional AI assistance

AI is off by default. Deploy `community-screen` only if wanted and set the
server-only `COMMUNITY_AI_SCREENING_ENABLED=true` after disclosing automated
review and the provider to members. It uses the existing server-only Qwen secret,
allowlisted provider endpoint and shared 5/minute, 30/day/account, 500/day/project
budget. Never place provider secrets in Expo public environment variables.

An active moderator may POST `{ "postId": "<uuid>" }` to `community-screen` with
their bearer token. The function reads only that pending Community post and its
parent's public-discussion text, not journals, account email or profile faith.
It produces flags and a short human-review summary. These annotations appear
only to staff in snapshots. Flags and summaries are untrusted suggestions, not
theological judgments or enforcement instructions. Failure, timeout, invalid
output or missing configuration leaves the item pending. AI cannot approve,
delete, suspend users or impersonate staff. Human review remains mandatory.
The app need not call this optional endpoint to post or moderate manually.

## Verify before public use

- Run `node --test tests/community-backend.test.mjs` and the existing backend tests.
- With two real signed-in test accounts, submit, approve with a separate staff
  account, reply, report and block. Confirm pending text stays private, reports
  stay private, and ordinary accounts cannot call moderation RPCs successfully.
- Confirm sign-out/account switching clears cached community data and failures
  are visible without replacing the live community with example conversations.
- Exercise account deletion, device keyboard/accessibility and staff response
  procedures in staging. Validate optional screening failures before enabling it.
- Publish community rules, privacy/provider disclosure, report/support contacts,
  escalation and appeals procedures before App Store release.
