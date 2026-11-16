# App Store submission — 16 November 2026

What was checked against Apple's App Review Guidelines (as published 16 October
2026), what this branch fixes, what still has to be done by hand before
pressing Submit, and ready-to-paste answers for App Store Connect.

This is a working guide, not a guarantee of approval.

## Fixed in this branch (`claude/app-review-fixes`)

| Guideline | Problem | Fix |
|---|---|---|
| 1.2 User-generated content | No Terms of Use or EULA; nothing stated zero tolerance for objectionable content or abusive users | Terms of Use in four languages (`mobile/src/app/terms.tsx`): zero tolerance, report and block, reports acted on within 24 hours, offending accounts suspended or removed. Agreeing is a required tick on the first onboarding step; the app opens only after it. Published at `/terms.html` |
| 5.1.1(i) Privacy policy | The policy called itself an early-access draft (all four languages) | Draft sentence removed |
| 5.1.1(i) | Policy only reachable inside the signed-in Profile | Terms and Privacy links on the sign-in screen |
| 5.1.1(i) | No privacy page on the app's own domain | `privacy.html`, `terms.html`, `support.html` now published with the landing page at `www.graceandgather.online` |
| 2.1 Completeness | Preferences said "Email delivery is not active yet" | Email reminders setting hidden |
| 2.1 | "Audio rooms are being connected" flashed on Create gathering before the server answered | Shown only when the server says audio is off |
| 2.1 | Developer wording a member could see: "Apple token revocation setup is incomplete; contact support before release", "Use a development build…", "…not configured yet" | Reworded or removed |
| 2.3.10 | Microphone message on iPhone said "device or browser settings" | Now "in Settings" |
| 5.1.1(ii) Permissions | Generic Face ID and camera permission messages for features the app never uses | Both keys removed from the iPhone build |

## Before pressing Submit (cannot be done in code)

1. **Reviewer sign-in (highest risk, guideline 2.1).** Everything needs an
   account. Before submitting, confirm:
   - The sign-in email with the 6-digit code reaches an outside address
     (for example a new Gmail account) within a minute. Supabase must use the
     custom SMTP sender, not its built-in mailer, which does not deliver to
     outside addresses reliably.
   - Sign in with Apple works on the TestFlight build, and Profile → Delete
     account removes the account.
   - Either create a review account that Apple can use, or explain in the
     review notes that any email address receives a code. Apple's text: "If
     your app includes account-based features, provide either an active demo
     account or fully-featured demo mode."
2. **Moderation staffing.** The Terms now promise action on reports within 24
   hours. Assign at least one moderator, turn on moderator phone alerts in
   Admin, and check the queues daily.
3. **Gatherings.** Any member can create a public live voice gathering with no
   review. See the separate pull request that limits creating gatherings to
   staff; it needs its database change applied to the live project.
4. **AI provider.** The README notes a 403 from the AI provider. AI guidance is
   off by default, but if a reviewer turns it on it must work or fail
   politely. Check one journal reply with AI on.
5. **Audio rooms.** Confirm the gathering audio service is configured in the
   live project, or a reviewer will see "Audio rooms are not connected yet".
6. **Build.** Submit the TestFlight build made with the `testflight` profile
   (bundle ID `com.graceandgather.ios`). The `production` profile does not set
   the bundle ID and is blocked by the readiness gate.

## App Store Connect

- **Privacy Policy URL:** `https://www.graceandgather.online/privacy.html`
- **Support URL:** `https://www.graceandgather.online/support.html`
- **Marketing URL (optional):** `https://www.graceandgather.online/`
- **License agreement:** keep Apple's standard EULA. The Terms of Use refer to
  it. Add this line to the end of the description:
  `Terms of Use: https://www.graceandgather.online/terms.html`
- Open each link from App Store Connect after saving, on a phone, without
  signing in to anything. Only `www.` works; the address without `www.` is not
  set up for HTTPS yet.

### App Privacy questionnaire

The app has no advertising, analytics or crash-reporting SDKs and does no
tracking. Every item below is **linked to the user** and used for **App
Functionality** only.

| Apple category | Data type | Collected because |
|---|---|---|
| Contact Info | Email Address | Sign-in (email code or Apple, which may be a private relay address) |
| Contact Info | Name | Optional display name, gathering host name, community names |
| User Content | Other User Content | Journal entries synced to the account, posts, replies, prayer requests, testimonies, comments, messages |
| User Content | Audio Data | Journal recordings and optional confession recordings; live voice in gatherings (not recorded) |
| Sensitive Info | Sensitive Info | Religious tradition chosen in onboarding |
| Location | Coarse Location | Optional city, region and country typed by the member (no GPS) |
| Identifiers | User ID | Account identifier |

Not collected: precise location, contacts, photos, health data, financial or
payment information, browsing or search history, diagnostics, advertising
data.

Third parties that process data on the app's behalf (for the privacy policy
and review notes, not separate questionnaire answers): Supabase (database,
sign-in, storage), Alibaba Cloud (AI journal replies, translation and safety
checks, only with the member's permission), LiveKit (live voice), Expo and
Apple (push notifications), Resend (email), Cloudflare (web hosting).

### Age rating

Answer the questionnaire as follows; App Store Connect calculates the rating.

- User-Generated Content: **Yes**
- Messaging and Chat: **Yes** (private messages between friends; live voice gatherings)
- Social media: **No**
- Unrestricted Web Access: **No** (links open in Safari)
- Health or Wellness Topics: **Yes, infrequent** (spiritual wellbeing; help lines for people in crisis)
- Medical or Treatment Information: **No**
- Advertising, gambling, contests, violence, sexual content, profanity, horror, alcohol or drugs: **None**

### Export compliance

The app uses encryption: HTTPS, and an encrypted database on the device
(SQLCipher) protecting the member's own journal. Its purpose is not
encryption itself, which is the usual basis for the exemption. App Store
Connect asks on every build until `ITSAppUsesNonExemptEncryption` is set, so
set it only after the team confirms the answer.

### Review notes (paste and adjust)

> Grace & Gather is a Christian prayer, Bible-reading and journaling app with a
> small moderated community.
>
> Sign in: use Sign in with Apple, or enter any email address and type the
> 6-digit code we send. [If you create a review account, give its address
> here and how the code reaches you.]
>
> After signing in, choose a language and tradition and agree to the Terms of
> Use. The church opens on Home. Talk to God opens the private journal. Bible
> Study, Discover, Confession and Gather are in the tab bar.
>
> Safety: every post, reply, prayer request and testimony is checked before
> anyone else sees it, by our moderators or, only if the member allows it, by
> an automatic AI review. Members can report content and block people (for
> example in Confession → Offer comfort, and in discussions and messages).
> Reports reach our moderators, who act within 24 hours. Contact:
> hello@graceandgather.online.
>
> AI: optional and off by default. When a member turns it on, journal text is
> sent to Alibaba Cloud to suggest a verse and a next step; the app explains
> this and asks first. It can be turned off in Preferences.
>
> Gatherings are scheduled live voice rooms; a session may not be running
> during review.
>
> Account deletion: Profile → Delete data or account.

## PR #155 (App Store links checklist)

It covers the Support URL, publishing and verifying the privacy policy, the
App Privacy questionnaire and a final link check. It does not cover:

- the Terms of Use link or the license agreement choice
- the reviewer sign-in and review notes
- age rating and export compliance
- that the policy URL can now be `https://www.graceandgather.online/privacy.html`
  (published by this branch), and that only the `www.` address works

## Known risks this branch does not fix

- **Sign-in is required for everything,** including the Bible reader (guideline
  5.1.1(v): "If your app doesn't include significant account-based features,
  let people use it without a login"). The app's account sync and community
  are a reasonable answer, but a reviewer may still ask.
- **Blocking is missing in some places:** prayer requests and testimonies have
  Report but no Block; Pay it forward has neither.
- **Live voice gatherings:** participants cannot report or block a specific
  person (the host can remove someone), and moderators can only mark gathering
  reports as reviewed.
- **Private messages** are delivered without screening; reported messages stay
  visible, and moderators cannot remove them or suspend the sender from the
  chat report queue.
- **Suspension** is only possible from the story-comment queue, and the
  Confession room does not check whether a member is suspended.
- Account deletion keeps a cancelled gathering's host display name and
  anonymous moderation logs.
