# Grace & Gather — mobile MVP and private web preview

Grace & Gather is the current working name. Public support contact: **hello@graceandgather.com** (mailbox verification is still outstanding). The original Still web preview and its browser journals are retained. The new `mobile/` app is a separate Expo / React Native application for iPhone, with optional Supabase accounts. The two account stores are not automatically merged. Existing storage keys, URL schemes and bundle identifiers retain their earlier technical names so the branding change does not reset device data or existing configuration.

## What is implemented

- Seven-screen, optional onboarding: language, name, intention, Christian tradition, scripture language, city/state/country, and optional notification email with consent.
- Journal, Explore, Learn and Gatherings tabs. Home has a daily verse, followed by text/audio journaling. The journal opens directly to writing or recording, with no feeling chips. While AI is disconnected, new entries receive clearly labeled general verses, actions and book recommendations; earlier entries retain their selected feelings.
- Four interface languages: English, Portuguese, Spanish and Russian. Some new operational/error and audio-room strings still require the final four-language review tracked in `release/readiness.json`.
- Native SQLCipher journal storage, a key in SecureStore, AES-GCM recording files, playback, history/search/deletion, and encrypted backup export/restore with a separately displayed recovery key. Native storage fails closed when SQLCipher or its key is unavailable. The browser rendering of the native app uses **temporary memory only**.
- Sourced Explore catalog: testimonies, stories, music histories, Bible animations, psalms and Catholic saint prayers. External media opens on the publisher. Community comments are pending until moderator approval; users can like, report and block. Likes and comments require a connected account.
- Free learning resources and three original courses with locally saved lesson progress.
- Calendar, series interest, capacity-limited reservations, and LiveKit audio-room integration. Host controls allow speaking, remove participants and close a room. No real gathering is scheduled until a host enters confirmed details.
- Charity suggestions match city **and** state/country, with Brazil as the initial directory. Visits and donations use the organizations’ official channels; no booking or payment API is claimed.
- Email-code authentication, optional Sign in with Apple, optional profile synchronization, local reminders, gathering notification infrastructure, in-app account deletion and device-data deletion.
- `/staff` is the internal moderation/editorial screen, protected by a server-assigned staff role. Staff can review comments/reports, suspend abusive authors, edit curated content and publish confirmed gatherings. Staff have no journal-reading API.
- Privacy/support pages use Grace & Gather and hello@graceandgather.com. The Apple release preflight blocks production builds while configuration and review items are unfinished.

## Run the mobile app

Use Node 24.3 or newer in the Node 24 line. Development here used Node 24.22.2. Dependencies are pinned in `mobile/package-lock.json`.

```sh
cd mobile
npm ci
npm run web -- --port 8082
npm run typecheck
npm run lint
```

For an iPhone development build, configure an Expo project and Apple credentials, then use `npx eas-cli@latest build --platform ios --profile development`. Full Xcode is needed only for local native builds; this Mac currently has command-line tools only. **Expo Go cannot open this app’s SQLCipher/LiveKit native modules.**

Copy `mobile/.env.example` to an ignored local `.env` and set the Supabase public URL/publishable key and Expo project ID when available. Set `APPLE_BUNDLE_ID` to the bundle ID registered in the Apple Developer account. `com.awaychurch.preview` is a development fallback, not an approved release identifier. No service-role, Apple private key, LiveKit secret or LLM key belongs in `EXPO_PUBLIC_*` variables.

The browser preview is for interface review. Native encryption, microphone permissions, SecureStore recovery, audio sessions, Apple sign-in, notifications and backup restore still require a physical-device test. Browser preview data disappears on reload; existing journals in the original web app are unaffected.

## Connect and deploy Supabase

The Supabase plugin was suggested, but no connected project or production database was available during this implementation. Nothing in `supabase/` has been applied to a remote project.

1. Connect/select the intended Supabase project. Review the migrations, then apply all four files in `supabase/migrations/` using the Supabase migration workflow. Existing Sites/D1 migrations are separate and unchanged.
2. Run `supabase/seed-content.sql` in that project to populate the sourced catalog. `npm run content:sync` regenerates the native catalog and seed from the authored web sources.
3. Configure production Auth SMTP and the email OTP template to include `{{ .Token }}`. The native app verifies a code, not a magic-link-only email. Configure `awaychurch://auth` as the redirect scheme.
4. Deploy the six edge functions. User functions verify the session with `auth.getUser`; the news endpoint is read-only; notification dispatch requires a separate server cron secret.
5. Configure only the services that will be enabled. `supabase/.env.example` lists server-side settings. Keep real secrets in Supabase secrets, never committed files. Generate a random 32-byte base64 key for Apple refresh-token encryption. Enable Apple sign-in in the app only after the native bundle ID, Apple provider and revocation flow are verified.
6. Assign an existing authenticated owner to staff using the project SQL editor: `insert into private.staff(user_id,role) values ('CONFIRMED-OWNER-UUID','admin');`. Never make staff assignment available to ordinary clients. Open `/staff` using that account.
7. For gatherings, configure LiveKit, confirm hosts and times, and test the host controls with two devices. Tokens authorize only an eligible member in the time window. Participants join muted. The app disconnects at the scheduled end; the protected notification scheduler also closes expired rooms when LiveKit is configured.
8. For email/push, verify the sender domain and mailbox, configure Resend and Expo push credentials, and schedule the protected `notifications-dispatch` endpoint. No schedule was activated and no emails were sent during development. Email is sent only to a consented address matching the authenticated, verified email. Delivery jobs use locks and stable email idempotency keys; push acceptance is not proof of delivery. Device receipt/error handling needs operational verification before release.

Official references: [Expo builds](https://docs.expo.dev/build/introduction/), [Supabase Apple sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [LiveKit Expo](https://docs.livekit.io/transport/sdk-platforms/expo/), [Apple account deletion](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

## LLM connection point

The user is handling the LLM provider. `supabase/functions/llm-journey/` returns an explicit `501 llm_not_connected`. Nothing sends private writing or audio to an AI provider. `mobile/src/lib/llm-contract.ts` defines a response contract limited to approved path, verse and action IDs. When implementing the provider, require a separate informed consent, protect the key server-side, handle failed transcription without losing drafts, allow the person to correct the interpretation, and retain exact scripture from the sourced catalog. The local keyword gate is limited and is not a complete risk assessment or monitoring service.

## Scripture and content coverage

| Scripture language | Protestant | Catholic | Orthodox |
| --- | --- | --- | --- |
| English | World English Bible | Douay-Rheims 1899 | Brenton Septuagint, Old Testament selections |
| Portuguese | Bíblia Livre (Feb 2018) | Not yet sourced | Not yet sourced |
| Spanish | Reina-Valera 1909 | Not yet sourced | Not yet sourced |
| Russian | Synodal NT selections | Not yet sourced | Synodal NT selections |

Unsupported combinations are explained; another tradition/language is never silently substituted. There are 36 curated quotations plus Psalm 23/22 in six editions, not a full Bible. `SCRIPTURE_SOURCES.md` records provenance. Final theology, translation, content-rights and age-rating reviews remain on the release checklist. News uses the past 24 hours of **publication timestamps**, not a claim about event dates. Courses, books, music and charities are independent external resources.

## Original web preview

`dist/` contains authored source; **do not delete it**. Only `dist/server/` is generated. The hosted URL and private audience stay unchanged. Its journals use IndexedDB and are not encrypted app storage. Likes, comments, onboarding profiles and series interest use the existing D1 backend. This private prototype is not the Supabase production app.

```sh
npm ci
node scripts/serve-community.mjs
npm test
npm run check
npm run build
```

The community preview defaults to localhost:4174. Use a separate `STILL_PREVIEW_PORT` and `STILL_PREVIEW_DB` for QA; do not overwrite someone’s active draft. The native app has its own localhost:8082 preview.

## Release checks and verification

`release/readiness.json` contains the exact remaining launch gates. `npm run preflight --prefix mobile` reports missing values and exits nonzero. Production EAS builds run that same gate; development builds remain possible. Public App Store support/privacy URLs must be accessible without the current private Site login. The supplied domain/email are not evidence that domain hosting or mail delivery is configured.

Automated checks include the existing 27 web/content tests plus Postgres RLS tests for profile isolation, moderation, impersonation, hidden content, rate limits, reservations, speaking permissions, reports, suspensions and notification recipients. Native TypeScript, ESLint, Expo compatibility, iOS/web Metro bundle export and Deno edge-function checks are run separately. A successful Metro export is not a signed iOS binary or proof of physical-device behavior.

The dependency audit currently reports no high/critical advisories; moderate findings stem from glob/minimatch in the Expo tooling dependency chain. Automated force-fix suggestions downgrade Expo and were not applied. Review compatible patched tooling before release. Actual production configuration, end-to-end authentication, real audio calls and notification delivery are not claimed verified.
