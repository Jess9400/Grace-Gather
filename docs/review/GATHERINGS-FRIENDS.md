# Gatherings and private friends

Gatherings opens with the calendar expanded. Dates mark sessions in the fetched catalog. A date narrows the list; clear-date restores it. Search matches the localized title/intro, topic and host. Upcoming, Live and My sessions use six items per page, reset on filter/search/date change, and retain reservation actions. The existing catalog endpoint returns at most 100 accessible sessions; pagination applies to that catalog. Calendar dates and displayed session times now use the viewer's local timezone.

Create gathering and Private chats are small text actions. Chats links to `/friends`, also reached from Profile and Community's Find friends action. This is separate from public Bible discussions.

Members explicitly save a display name and opt into discoverability. Search returns only opted-in names and IDs, never email, location or private profile fields. Requests must be accepted by the recipient before messaging. Pending requests cannot chat. Crossed requests do not auto-accept. Declined requests have a seven-day cooldown. Requests are limited to 20/day and messages to 20/minute. Chat history loads 50 messages at a time and refreshes every 10 seconds while focused. This version has no push or unread message badges.

Block stops search/contact and closes the relationship. Reported messages are reviewable by staff through Friends & chats → Chat reports; ordinary members cannot retrieve this queue. Database tables deny direct app access; the private checked function is exposed via a security-invoker RPC. Account deletion cascades data. This is server-stored private messaging, not end-to-end encryption.

Backend migration applied to project gxuwmgztksktacwvdipy. `supabase/tests/friends_privacy.sql` runs synthetic users/messages inside a rolled-back transaction and passed acceptance, message isolation, reporting, blocking and permission assertions. The directory remained empty after testing. Security advisors have no new warning categories; five new private RLS/no-policy informational findings are expected because app table grants are revoked and access is through checked RPCs. Existing warnings remain (authenticated definer functions and leaked-password protection).

Validation: typecheck/lint/web export and browser layout inspection. Local preview lacked backend environment configuration, so actual session markers/list and signed-in friend screens still need two-device UI acceptance testing. No native device test was performed.
