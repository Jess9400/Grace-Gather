# Discover, community testimonies, and audio Gatherings

Implementation and audit: 4 November 2026. Confession screens, entrance assets,
animation, and service logic were left unchanged.

## What the audit found

The existing mobile catalog contained 12 published editorial feed records in
Supabase `content_items`, seeded from `dist/community-data.js` through the mobile
catalog. These are sourced editorial introductions, not member submissions.
Courses and volunteering listings use separate kinds in the same table.

News previously came from one Positive News RSS request in the `news` Edge
Function: an eight-second timeout, process-local five-minute cache, no durable
fallback or source diagnostics. Both the publisher and deployed endpoint returned
200 during this audit; the earlier outage could not be reproduced or attributed
to a specific failed request. A failed or timed-out fetch had no durable recovery
path. The new database cache and failure log address that failure mode.

Comments and likes already persisted in Supabase. The story screen combined
comments, likes, and aggregate statistics into one failure path, and refreshed
auth inside its auth-state callback. Those operations are now independent; auth
callbacks defer reloads. A statistics error no longer masquerades as a comment
connection failure. The previous error was not reproducible against current
read-only API checks. Shares previously opened publisher links and had no stored
interaction. Saves were absent.

The native room already used LiveKit. The web room was a placeholder, and a native
room belonged to its screen, so leaving the screen disconnected it.

## Current data flow

- `private.testimonies` holds exact author text, account association, drafts,
  revisions, pending reviews and private rejection explanations. Authenticated
  `testimony_command` invokes tightly scoped, private authorization code.
- Publishing requires a full preview, audience acknowledgement and explicit
  Publish. It creates a pending version, never automatic approval. Approval copies
  only reader-safe fields into `content_items`; anonymous posts omit account IDs
  and names. Editing withdraws the visible version until reapproval. Authors can
  delete their posts and associated interactions from My testimonies.
- Moderator reviews compare the expected revision to prevent approving stale
  text. Reporting uses the existing private reports queue. Moderators can remove
  a reported testimony with a private explanation. Comments remain pending until
  reviewed. There is no automatic rewriting or AI editing of member testimonies.
- `discover_page` uses `(sort_at,id)` keyset pagination. The default collection
  combines editorial stories, community testimonies and current news. Older news
  has its own collection. The 24-hour filter uses publication timestamps, never
  inferred event dates. Existing editorial records have no invented publication
  date.
- Likes, comments, saves and signed-in share actions are persisted. The share
  record means the platform share UI reported a share action, not that delivery
  to a recipient was verified. Guest shares work without tracking. No fabricated
  posts, participants or engagement are seeded.
- Full stories use `/app/story/<id>` on the hosted preview. Publisher links are
  optional references in Sources. Feed filters and stack scroll state survive a
  return from a story.

## News sources and editorial handling

Sources live in `private.news_sources`; the server fetches RSS, normalizes dates
and URLs, removes HTML/navigation, rejects unsafe/off-source URLs and deduplicates
canonical URLs and normalized titles. The last successful imported records remain
available when a source fails. Import leases prevent concurrent refresh storms;
`private.news_failures` retains diagnostic codes for 30 days. A Supabase
`pg_cron` / `pg_net` job named `grace-discover-news` refreshes every 15 minutes.
The endpoint can also refresh when a reader opens a news filter.

Enabled sources:

- [Global Voices Good News](https://globalvoices.org/-/topics/good-news/feed/),
  attributed under the [site's CC BY 3.0 license](https://globalvoices.org/about/).
- [NASA](https://www.nasa.gov/feed/), with attribution and its
  [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
  Technical bulletins, storm/disaster stories, APOD and administrative notices are
  excluded from the uplifting collection. No publisher photographs are copied.

[Positive News terms](https://www.positive.news/terms-and-conditions/) restrict
systematic storage/republication. Its source is retained but disabled until the
owner obtains permission; do not enable it merely because RSS is reachable.

Three launch news items have original, source-grounded two-paragraph summaries and
fuller accounts in `news-editorial.json`. Their verified event dates remain
separate from publication dates. Other imported material uses explicitly labelled,
attributed publisher excerpts where permitted. Short sources stay short.
Optional future Qwen news summaries are disabled by default. Once Alibaba access
is ready, configure `NEWS_SUMMARIZATION_ENABLED=true` alongside the existing Qwen
server secrets. Only public source text is sent; new numerical claims and invalid
responses are rejected, and failure retains the permitted excerpt. Editorial
review is still necessary; automated summaries are not independent fact checks.

## Gatherings and remaining audio setup

Hosts can create now or schedule a persisted session with title, description,
topic, language, IANA timezone, visibility and capacity. The database validates
local times (including nonexistent daylight-saving hours), future dates, limits,
and account participation. An ambiguous repeated hour uses PostgreSQL's later
standard-time occurrence; the form discloses this. Invite tokens remain in a
private table and are shared only by the host. Invite acceptance and capacity
checks lock the same gathering row. The host counts toward the limit.

The app-level audio provider retains a room while browsing and provides a compact
return/mute/leave bar. Native and web adapters use the existing LiveKit SDKs. Actual
participant events and audio activity drive roles, counts and speaking rings.
Users join muted; microphone access is requested only when they choose to speak.
Host actions update server permissions, revoke removed participants' tokens and
end rooms. Camera and screen-share publishing are excluded from token grants.
Tokens expire within five minutes or the scheduled end, whichever comes first.
Leaving disconnects tracks and stops the native audio session. No recording is
requested. Browser/device audio routing controls are used only where supported.

**Live calls remain blocked by missing LiveKit configuration.** In the existing
Supabase project's Edge Function secrets, configure the LiveKit project values:

- `LIVEKIT_URL` — the project's `wss://…` URL.
- `LIVEKIT_API_KEY` — server API key.
- `LIVEKIT_API_SECRET` — matching server secret.

Never put these credentials in `EXPO_PUBLIC_*`, Git, screenshots, or chat. The
read-only GET `/functions/v1/gathering-token` reports configuration presence only.
After setting them, use two real accounts/devices to verify audio, mic permission
denial, host promotion/removal, reconnecting, output routing and room ending.
An Expo development/EAS build is required for native LiveKit; Expo Go is not an
audio-room test environment. Scheduling remains available meanwhile.

## Moderation and verification

The previously selected, verified account `023logistica@gmail.com` is assigned the
moderator role. Account → community tools → stories/comments moderation opens
`/staff`; testimony reviews live at `/testimonies/review`. Rejection notes are
private. This grants no journal-reading access.

Automated verification covers author isolation, anonymous publication, explicit
consent, revision races, rejection privacy, saves, hidden-content aggregates,
news freshness/deduplication/failure fallback, invitations, capacity, scheduling
and timezone validation. Existing Confession and auth-persistence checks still
pass. Web and iOS bundle exports, TypeScript and lint are run separately.

Browser QA uses 360, 390 and 430 pixel viewports. Local preview text was entered
only to inspect preview formatting; it was neither saved nor published. Database
writes and engagement tests use disposable local Postgres fixtures, not fake live
community activity. Real-device keyboard and two-client microphone behavior remain
release checks until LiveKit credentials and devices are available.

Supabase's security advisor continues to flag pre-existing authenticated definer
RPCs and disabled leaked-password protection. New private service tables
intentionally have no client RLS policies: direct access is denied and bounded
functions enforce ownership. The new exposed testimony/gathering wrappers are
security-invoker functions. See the [advisor documentation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
