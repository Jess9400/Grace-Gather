# Community implementation and moderation

Community uses Supabase authentication and the approved native design. Members
choose a public alias and optional perspective. Diary entries, private profile
faith and account email are never copied into posts. Returned author UUIDs are
opaque account identifiers for blocking, not verified public identities.

## Automated moderation

No human moderator is assigned by this change. Every submitted topic or reply
starts pending. The app requests community-moderate, which verifies the caller,
loads that caller's pending post or a post they reported, and sends bounded post
text, parent discussion and report context to the existing Alibaba Cloud Qwen
service. The provider endpoint is allowlisted and secrets remain server-only.
The agent can publish only an explicit acceptable result with no flags and no
uncertainty. A service-only SQL function rechecks ownership/report scope, pending
state, account eligibility, parent publication and flags before changing status.
It cannot grant roles, ban users or access private journals.

Concerning or uncertain results hold the post privately. Malformed output,
timeout, missing configuration and quota exhaustion leave it pending. Held posts
cannot be automatically re-approved by repeated checks. Authors can check an
unfinished publication attempt again or delete their own post. Held posts and
appeals remain unpublished until a review process is introduced. This is not
human-equivalent judgment or continuous monitoring. No emergency response is
promised. Reports trigger a fresh agent check; concerning reported posts are
held, while acceptable reported posts remain published and that report resolves.

The initial RPC and subsequent agent request are separate. If a client closes
between them, the saved post stays pending. Check publication retries unfinished
checks. No background worker or guaranteed review time is claimed.

AI calls share the existing request budget: 5/minute/account, 30/day/account and
500/day/project across all AI features. These are request limits, not a currency
spending cap. Community AI processing is disclosed before posting and in all
four privacy-policy languages. Interface Community copy currently uses English.

## Deployment

On November 4, 2026, both migrations and community-moderate were deployed to
Grace & Gather project gxuwmgztksktacwvdipy. No human moderator was assigned.
Automatic Community processing remains OFF. The user prefers a private/local
moderation option; no local model was installed or launched. The app can save
private pending submissions, but automated publication is not active.

Apply 20261104180000_community_discussions.sql followed by
20261104190000_community_agent.sql. Deploy community-moderate and set server-only
COMMUNITY_AUTO_MODERATION_ENABLED=true and client
EXPO_PUBLIC_COMMUNITY_AUTO_MODERATION=true only after explicit approval of the
processor and payload. That approval has not been given. Never put provider credentials in Expo public variables. The
optional community-screen endpoint is retained for a future authorized staff
workflow; it is not required for automatic posting. Existing Confession screens,
services and their separate human moderation remain unchanged.

Local examples require EXPO_PUBLIC_COMMUNITY_DEMO=true and no Supabase backend.
Live builds never fall back to examples after request failure. Sign-out and
account changes clear cached content and stale responses are discarded. Members
can report, block, unblock and permanently delete their posts. Topic deletion
also removes replies. Auth deletion cascades related data. Private audit records
store actions without post bodies; identifiers are nulled on deletion. Rate-limit
activity survives post deletion and cascades on account deletion. Production
retention and appeals operations still need decisions before public release.

Snapshots show recent30 topics, selected/own/pending/report targets and bounded
recent100 replies plus review targets. This is not a complete searchable archive.
Held content is excluded from public reads. Exact Bible edition IDs are retained;
only explicitly mapped curated quotations join full-reader threads.

## Validation

Permission tests use Postgres with Supabase-like permissive grants to verify
client table isolation, author privacy, service-only agent actions, human role
restrictions, reports, blocks, rate limits, deletion and bounded queues. Model
parser tests reject malformed/uncertain/flagged allows. Before public release,
validate the full flow with real signed-in accounts and device keyboards,
accessibility, provider failures, false positives and false negatives. Test each
supported Community language before advertising multilingual moderation quality.
