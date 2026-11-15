# Grace & Gather: next private TestFlight checklist

This checklist is for the next **internal iPhone test**, not App Store submission or external beta review. A merged change or passing automated check does not mean it has been tested on an iPhone. Use fictional, non-sensitive text for shared test content; never include login codes or personal journal entries in a bug report.

Record: build number, app version, source commit, test date, iPhone model, iOS version and tester. For each item mark Pass, Fail or Not tested; attach a screenshot or screen recording when useful.

## Before building

- [ ] Confirm Taya's intended final logo and iPhone icon are merged; verify the icon and splash artwork in the build. The earlier chapel-emblem logo was merged in PR #152; a newer update had not been confirmed at the time of this checklist.
- [ ] Confirm the build is from the desired latest `main` commit and includes PR #161 (screen cleanup) and PR #162 (loading and previews). Subscription proposal #88 and PR #118 remain excluded unless the team explicitly decides otherwise.
- [ ] Confirm the TestFlight build profile, app identity, production backend, Apple signing and push credentials. Verify that private credentials are not bundled in the app.
- [ ] Confirm the updated `confessions` service is active. Version 6 was deployed after PR #162; its reviewed code and unauthenticated rejection were checked, but a real signed-in comfort-list test is still needed.
- [ ] Create the iOS build, record its version and build number, upload it, and check Apple processing and any encryption questions. Make it available to the existing internal testers only. Do not submit for external beta review or App Store review.

## First-run and everyday experience

- [ ] Install the new build on a physical iPhone. Check the app icon, opening screen and sign-in with Apple and email. Close and reopen the app and confirm the session remains signed in.
- [ ] Complete onboarding in English and Portuguese. Check that the app language and separately selected Bible language are respected, and that permission choices are understandable and can be changed later.
- [ ] Test the entrance and home church for each tradition, including the day/night scenes, controls, tour arrows and animation. Record unusually long waits or failed artwork without assuming a particular speed target has been met.
- [ ] Open each main tab. Check loading, scrolling, keyboard, back and Home navigation, small screens, larger text and VoiceOver labels. Note any frozen, blank or clipped screen.

## Journal and privacy

- [ ] Write and submit a test entry. Confirm visible progress, one relevant verse and one suggested action, then continue the conversation and try an action. Check that returning to the journal preserves the entry.
- [ ] Verify account sync on two signed-in devices, optional import of older local entries, export and recovery. Test deletion only with a disposable test account and test data; confirm the outcome rather than assuming a successful tap deleted everything.
- [ ] Test journal and community AI choices in onboarding and Preferences: decline, enable and withdraw. Check that translations fall back to the original when required and that an unavailable AI service gives a clear response. Do not enter sensitive test text.

## Sharing, previews and loading

- [ ] Preview a prayer request, discussion, testimony, Unburden/Confession submission and Pay it forward recommendation. Each preview should open as a pop-up, show the submitted content and audience, allow editing, and require a separate final sharing action.
- [ ] During a slow connection, submit a prayer, journal entry, discussion, testimony, comment, gathering and charity recommendation. Confirm visible progress, no duplicate submissions, a clear outcome, and preservation of the draft after an error. Check that a pop-up cannot accidentally be dismissed while its submission is processing.
- [ ] Open Offer comfort and confirm the list appears immediately with a loading message, then shows available items or an accurate empty/error state. Check the correct language, reservation, opening and response. Record approximately how long it takes on a real phone; compare again after deployment rather than assuming the server change solved every delay.
- [ ] Check Confession/Unburden submission, confirmation, moderation and replies with two separate accounts. Moderators must not approve their own submission. Confirm anonymous-to-listeners wording and moderator access are clear.
- [ ] Check Discover stories and discussions, comments and long text, sources, links and available translation/original text. Verify Portuguese content and the selected Bible edition; identify gaps without inventing or translating Scripture.
- [ ] Check candle rendering and intentions, gathering date/time visibility, recurring sessions, attendance and group audio. Confirm a real session appears correctly in Upcoming and My sessions.

## Notifications

- [ ] On physical iPhones, opt in to phone notifications. Using two separate accounts, test a message, discussion reply, confession response, prayer activity and gathering reminder. Check the iPhone alert, in-app category, unread state and destination when tapped. Test denied permission and retrying later.
- [ ] Submit an item needing moderation from a different account and verify that each authorized moderator receives a phone alert and can open the correct queue. Confirm alerts do not reveal private content on the lock screen.

## Separate Android testing

TestFlight is for Apple platforms and cannot install an Android app. An Android tester needs a separate Android build: a private installable APK, or an internal test through Google Play once a Play Console account and the Android release setup are ready. Decide which route to use and verify Android-specific sign-in, permissions, audio, notifications and layouts; an iPhone pass does not establish that Android works.

## Before App Store submission, separately

- [ ] Finalize the public privacy policy using the verified provider, retention, deletion, backup and cross-border-processing details. Confirm its direct HTTPS URL, support URL and working contact email in App Store Connect.
- [ ] Review App Privacy labels, age rating, account deletion, AI consent, content moderation and report/block behavior. Avoid unsupported claims about retention or end-to-end encryption.
- [ ] Prepare listing text, screenshots, review contact and sign-in instructions. Decide separately whether external beta testing is needed.
- [ ] Replace the landing page's coming-soon treatment with the verified App Store listing link only after the listing is available.
- [ ] Decide subscriptions and AI usage limits separately. They are not prerequisites for an internal test, but monitor usage and spending.
