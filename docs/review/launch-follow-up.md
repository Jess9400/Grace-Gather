# Launch review: proposed follow-up and product decisions

This is a discussion brief, not a claim that the items below are implemented.
The November 2026 review tested the web application while signed out; native
devices and signed-in journeys still need testing. Never use real journal or
confession content as test data.

## Six experiences that need work

1. **Journal response.** Explain sign-in before asking for a personalized
   response, preserve the entry through sign-in and errors, and let the member
   explicitly retry. Review the theme-to-verse and action mappings across all
   supported languages and traditions with appropriate pastoral input. Avoid
   suggesting that someone should write the same thing immediately after they
   have already written it. Test safety handling separately.
2. **Discover.** Keep the existing Stories/Testimonies and Discussions feeds
   while the team decides launch visibility. Source licensed, attributed
   content in each launch language, show the original language honestly when
   no translation is available, monitor the daily import, and keep an honest
   empty state. Do not invent posts, people, or engagement.
3. **Candle.** The candle screen now offers an optional memorial intention and
   an explicit return to the journal entry. Only the entry ID is passed, not its
   text. Review tradition-specific wording and test on devices before shipping.
4. **Unburden.** Keep its own tab. Clearly explain that it is community comfort,
   not sacramental confession, and does not guarantee an immediate response.
   Review localized urgent-help guidance and the human moderation process;
   never imply continuous monitoring. Respect the existing design work.
5. **Languages.** Keep interface and Bible languages independent, and show
   both choices together so the user can deliberately change either. Eliminate
   conflicting tradition controls and preserve unavailable-edition warnings.
6. **Journal backup and deletion.** Date pickers select export ranges and
   deletion confirmation uses a word in the selected language. Test readable exports and
   encrypted backup/restore on actual devices and explain that local entries
   are not automatically synchronized. Do not change retention or delete data.

## Product decisions for Jessica and her collaborator

- **Navigation:** Jessica prefers the current tabs; do not combine Confession
  and Gatherings into Together. Improve the back arrow on pages.
- **Discover:** keep the two-feed design in the product. Discuss whether to
  temporarily hide it for launch until content, discussion activity, and
  language coverage are sufficient; do not present invented activity.
- **Gatherings:** staff-hosted sessions are acceptable for the initial launch;
  consider onboarding trusted outside hosts. Decide who can host and how they
  are approved before implementing restrictions.
- **Friends and private chats:** Jessica prefers improving rather than hiding
  them, but is open to discussing a temporary delay for launch readiness.
- **Pay it forward:** keep the destination and add real, appropriately vetted
  organizations; do not claim a listing is verified without verification.
- **Check-in:** an optional in-app check-in appears from the next local day
  after a member opens an action. It does not send a push notification.
- **Accounts and audience:** sign-in is required before browsing. Journal
  entries remain on the device, but a signed-out person cannot open them until
  they can sign in again. Do not widen existing server access policies.
- **Bible language:** keep it independent of the phone and interface language.
- **Timing:** November 29 is acceptable as a target, contingent on safety,
  privacy, device testing, content rights and actual launch readiness.
- **AI plan:** PR #88 and paid membership remain separate decisions. A daily
  free allowance must be enforced server-side and tested before it is promised.
