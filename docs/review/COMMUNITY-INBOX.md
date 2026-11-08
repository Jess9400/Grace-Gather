# Profile inbox, prayer invitations and community presence

Status: design/implementation proposal for contributor review. This PR does not implement messaging, deploy a migration, or enable notifications. It captures the approved product direction and concrete acceptance criteria before work on private communications. Keep this PR draft until the contributor has reviewed the API and release plan.

## Approved placement

Clicking the avatar opens Your space. Keep the existing Profile, My Journal and Community entries. Add Chats and Notifications here, with separate unread counts. Keep My testimonies inside Profile, not Discover. Do not add a Chats bottom-navigation tab and do not label public Community discussions as private chats. Remove the existing Gather → Chats link that currently opens `/community` when the real inbox is implemented.

The avatar displays the sum of unread incoming messages and unread notification items, capped visually at 99+. Zero has no badge. The accessible label says "Account and settings, N unread messages and notifications"; never announce every real-time change continuously. Inside the menu show exact individual counts (also visually capped at 99+ if needed).

Counts must come from the signed-in account's backend data. No random numbers, samples, presence totals or counts of all historical messages. Signed-out, missing-service and error states have no numeric badge; an unavailable inbox is not represented as "0 unread". A stale cached count may be shown only with clear refresh handling, never from a previous account.

## Private chat MVP

- Chats list: accepted conversations with last-message timestamp and unread incoming-message count. Message previews are optional, off on lock-screen notifications.
- Opening a thread shows messages only to current participants. Do not promise end-to-end encryption unless it has actually been implemented and audited. Transport encryption and database access controls are not E2EE.
- First contact requires an invitation and recipient acceptance; users can decline, block and report. No automatic DM access based on a confession, prayer request or public testimony.
- Invitees cannot see historical thread content until they accept; for MVP prefer strictly two-person threads to avoid complicated membership-history rules.
- Send requires an explicit action. Keep drafts separate from public content and from the journal; no automatic transfer of journal/confession text.
- Mark messages read only after the thread is visible and the received message sequence is rendered. Merely opening Profile or Chats does not mark all messages read.
- If another message arrives during a read operation, it remains unread. Use a server-validated monotonic message sequence cursor, not the client clock.
- Block stops new invitations/messages in both directions. Report permits a deliberately scoped message excerpt to be shared with authorized moderation, with that audience explained before sending.
- Define rate limits and moderation response coverage before enabling public signups. Reuse current account eligibility/block rules; do not invent a second authorization model.

## Proposed persistence/API contract (not deployed)

A migration should define `chat_threads`, `chat_members` (thread/user/accepted/read-through sequence), `chat_messages` (thread/server sequence/sender/body/created/deleted state), `chat_invitations`, and `member_notifications` (recipient/type/target/read_at/dedupe key). All foreign keys should support the existing account-deletion workflow.

RLS must restrict every read to an authorized recipient or accepted participant, and every update to the owning read marker. Clients must not set recipients arbitrarily, change senders, publish moderation records, or manufacture unread counts. Database grants must be explicit. Server-created notification rows use narrowly scoped trusted writers.

Suggested API:

- `inbox_summary()`: `{messagesUnread, notificationsUnread}` for `auth.uid()` only.
- `inbox_notifications(cursor)`: paginated recipient-owned records.
- `notification_read(id)`: idempotent recipient-owned operation.
- `chat_list(cursor)` and `chat_messages(thread, before)`: membership checked on every call.
- `chat_send(thread, body, clientNonce)`: membership/block/length/rate checks; dedupe retries with `(sender, clientNonce)`.
- `chat_read(thread, throughSequence)`: clamp to an existing visible message and advance only.
- `chat_invite`, `chat_accept`, `chat_decline`, `chat_report`, `chat_block`: separate explicit operations with documented side effects.

Do not use user-editable profile metadata for roles. Audit SECURITY DEFINER functions, use a fixed search_path and revoke implicit PUBLIC execute. Prefer security-invoker operations backed by RLS where practical.

One application-level inbox provider should subscribe after authentication and refresh on focus/reconnect; avoid each avatar opening its own socket. Clear all state synchronously on account switch/sign-out, and reject late results with a generation/request key. A single debounced invalidation/refetch can reconcile Realtime events; periodically revalidate rather than trusting client increments/decrements as authoritative.

## Notifications

Notifications are distinct from private messages: gathering updates, accepted invitations, new discussion responses and testimony moderation decisions. Notification records carry typed internal targets, not unrestricted URLs. Authorize the target again when opened; show an unavailable state for deleted/private content.

Create at most one notification per event and recipient. Do not count a chat push again as a separate notification: the unread message already contributes to the avatar total. Push/email delivery attempts do not create additional unread items. Opening a notification marks that item read; mark-all-read should use a server cutoff so new arrivals survive.

Ask separately for operating-system push permission and for prayer-invitation subscriptions. Existing Resend sign-in delivery is not consent to community marketing or prayer emails. Do not send any notification during preview or review without explicit test opt-in.

## Prayer together

Add a public-facing action to request prayer and an optional invitation to a hosted gathering. Compose → audience explanation → preview → explicit Share prayer request. Default to no automatic notification blast.

Explain whether the request is visible to signed-in members, invited participants or moderators, its retention period and how to withdraw it. Keep confession and journal content entirely separate. Anonymous-to-members still means account-linked for moderation; do not reveal authorship through event payloads or invitation URLs.

Requests enter the existing reviewed-content workflow. Only approved requests can produce invitations, and only to opted-in eligible recipients. An online person is not automatically available to listen. Add explicit availability if invitations are targeted by availability; apply quiet hours, rate limits, expiry and unsubscribe controls. No immediate-response promises.

Use the existing gathering authorization and LiveKit token flow for actual audio participation. Recheck membership/bans/room status on join. Showing a Join button must not itself publish a user's microphone or create a public event.

## Presence

Following the owner-approved 8 November review, anonymous presence joins for everyone only while Home is focused and the entrance has finished. Show “There are N people in church right now” (or “You’re the first one here right now” for one) for about five seconds, then fade. No participation opt-in. Implementation caveat: the existing service counts connected clients, not deduplicated people; multiple devices can inflate this approximate count. No member roster or identity disclosure by default; presence is not permission to receive a DM or invitation.

## Required tests before marking implementation ready

1. Two accounts cannot read each other's inbox, invite details or unrelated message threads; anonymous requests fail.
2. Invite pending/declined/blocked members cannot read/send; moderators do not have unrestricted private-chat browsing by default.
3. Signed-out/account-switch/reconnect races never show a previous account's count or content.
4. Message arrives during read: old messages clear, new message remains unread; duplicate sends/delivery retries do not double-count.
5. Profile opening leaves counts unchanged; correct thread/notification actions update the right count; 0/1/99/100+ render correctly in all four languages and with VoiceOver/large text.
6. Reports have an audit trail; blocked sender cannot notify; deletion invalidates links and removes linked account records according to the documented retention policy.
7. Prayer request preview never publishes until Share; pending/rejected content never creates invitations; opt-out and quiet hours are enforced server-side.
8. iPhone and web tests use consented test accounts; no simulated community engagement in production.

## Contributor decisions

Confirm the private messaging moderation/access policy, retention policy, notification event list and reciprocal invitation behavior. After that review, implement and test the migration on an isolated database branch, run security advisors, and open code PRs with explicit rollout/rollback instructions. Do not deploy the proposal to the production Supabase project during review.

## Implementation gate
This remains a design-only draft. Moderation staffing, retention periods, audience visibility and abuse handling require owner/contributor sign-off before any chat, notification or prayer-invitation migrations. No migration or message sending is authorized by this document alone.
