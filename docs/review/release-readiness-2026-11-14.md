# Release readiness — 14 November 2026

This is a working checklist, not a declaration that Apple will approve the app.

## Checked

- Namecheap forwards `hello@graceandgather.online` to the designated Gmail inbox. Jessica confirmed that a test message arrived on 14 November. Outgoing mail from the branded address has not been configured or tested.
- The live Grace & Gather database lists the account-journal and AI-consent migrations as applied. Journal table policies restrict reads and writes to the signed-in owner; journal audio has separate storage policies. These metadata checks do not replace a cross-account device test.
- The live discussion review and report-resolution functions require the moderator check. The automated community backend tests exercise access denial and moderation. Real notification delivery and staff workflows still require end-to-end tests.
- The logo and icon are included in merged PR #152. An installed iPhone app needs a new build to receive its icon.
- App Store Connect is in Prepare for Submission and is set to manually release after approval. No build is selected for the App Store version. The privacy questionnaire, privacy-policy URL, age-rating questionnaire and content-rights information have not been set up. A primary category, description, keywords, support URL and review contact also remain to be provided.

## Before submission

1. Review the privacy policy against actual providers, retention, deletion, backups and all platforms. The generated mobile public pages and in-app policy use the same source, but still contain an early-access review notice. Verify the public URLs are reachable without login before entering them in App Store Connect.
2. Review the AI permission experience on iPhone, including declining and withdrawing journal/community permissions. The notices identify the outside processor and categories of data before the member agrees. Verify that all backend paths respect the choice.
3. Blocking is scoped differently across community, friends, and the anonymous room. Do not mirror anonymous targets to the publicly readable block list: it may expose their identity. Design and test consistent protection without disclosing anonymous identities; verify reporting and moderation in every content area.
4. Retest real devices: Apple/email sign-in and session persistence, onboarding, journal sync across accounts and devices, restore/delete and account deletion, Bible language, recording, moderation, audio gatherings, notifications, slow connections, VoiceOver and larger text.
5. Complete and verify App Store Connect metadata: screenshots, description, privacy answers, support and privacy URLs, age rating, review contact and reliable reviewer sign-in. Review rights for images, music, Bible texts and publisher content.
6. Supabase Security Advisor reports authenticated security-definer functions that must each be assessed for intentional access and authorization. Its RLS-without-policy informational findings can be intentional for tables accessed only through authorized server functions; do not add permissive policies merely to silence them. See https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.

Jessica is working on the landing page now; social accounts are planned for after Apple approval. PR #88 and the subscription plan remain undecided; this checklist does not enable them.
