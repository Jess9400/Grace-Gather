# Grace & Gather: next internal TestFlight checklist

This is a working checklist for the next build, not an assertion that every feature has passed on a physical iPhone. Record the build number and commit when the build is created. Do not submit for external review or public release as part of this checklist.

## Before making a build

- [ ] Merge the reviewed privacy and AI disclosure changes and confirm the build uses that exact main commit. Confirm any other desired fixes have been merged. PR #118 and the subscription proposal #88 were deliberately left open; they are not automatically included. PR #155 tracks launch links.
- [ ] Verify Apple sign-in and email sign-in on the actual build, onboarding in English and Portuguese, the Bible language selected independently, and the ability to stay signed in after reopening the app.
- [ ] Verify the journal saves and synchronizes across two signed-in devices, that older local entries are added only when chosen, and that exports and account deletion work. Check the privacy implications and configured backup retention with the service providers.
- [ ] Verify journal and community AI permission choices in onboarding and Preferences: decline, enable and withdraw. Check that translation falls back to the original when a participant has not consented; check journal replies with consent and when the service is unavailable. Obtain the provider's actual retention and deletion settings before finalizing the public policy.
- [ ] Test moderator phone alerts, replies and messages on physical iPhones using two separate accounts; check notification permission, in-app indicators and links. Test moderation from a different account than the content author. Confirm live service configuration and delivery; a passing code test is not proof of delivery.
- [ ] Test confession submission, confirmation and replies; candle rendering; the discussion feed and long text; gathering date/time, recurring sessions and audio; and the home church tour and animations in each tradition. Confirm the navigation and back buttons return people to an expected place.
- [ ] Check loading, scrolling, safe areas, screen-reader labels and text size on a physical iPhone. Note device, operating system and failures.
- [ ] Confirm the EAS TestFlight build profile uses the intended production bundle identifier, project and backend environment, with no secrets bundled in the app. Confirm Apple signing and push credentials are current.
- [ ] Create a new internal TestFlight build only after deciding which issues must block testing. Verify the build number, encryption declaration, processing status and internal tester availability in App Store Connect. Internal testing is not public release.

## Before App Store submission, separately

- [ ] Finalize and publish the full privacy policy on the public domain after reviewing the actual providers, retention periods, backups, deletion and cross-border processing. Set and verify its direct HTTPS URL in App Store Connect; the support URL is https://www.graceandgather.online/ and hello@graceandgather.online has been tested for incoming mail.
- [ ] Complete and review App Privacy labels, age rating, account deletion, AI consent, content moderation and report/block behavior with Apple’s current requirements. Do not claim data is never retained or encrypted end-to-end without evidence.
- [ ] Prepare app listing text, screenshots, review contact and sign-in instructions, and assess external TestFlight review separately if external testers are wanted.
- [ ] Replace the landing page’s coming-soon treatment with a verified App Store listing link after the listing is publicly available.
- [ ] Decide subscriptions and AI usage limits separately; neither is required merely to create an internal testing build, but usage and spending should be monitored.
