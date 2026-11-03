# Grace & Gather — mobile MVP and private web preview

Grace & Gather is the current working name. Public support contact: **hello@graceandgather.com** (mailbox verification is still outstanding). The original Still web preview and its browser journals are retained. The new `mobile/` app is a separate Expo / React Native application for iPhone, with optional Supabase accounts. The two account stores are not automatically merged. Existing storage keys, URL schemes and bundle identifiers retain their earlier technical names so the branding change does not reset device data or existing configuration.

## What is implemented

- Seven-screen, optional onboarding: language, name, intention, Christian tradition, scripture language, city/state/country, and optional notification email with consent.
- Journal, Explore, Bible Study, Confession and Gatherings tabs. Home has a daily verse, followed by text/audio journaling. The journal opens directly to writing or recording, with no feeling chips. Native users can explicitly opt into Qwen theme suggestions and audio transcription; without AI or when it fails, entries receive labeled general guidance. Users can correct the suggested theme. The original web preview still uses general guidance.
- Four interface languages: English, Portuguese, Spanish and Russian. Account, email-code, backup/restore and audio-room controls include all four languages. Final native-speaker and editorial review, including internal staff tools, remains tracked in `release/readiness.json`.
- Native SQLCipher journal storage, a key in SecureStore, AES-GCM recording files, playback, history/search/deletion, and encrypted backup export/restore with a separately displayed recovery key. Native storage fails closed when SQLCipher or its key is unavailable. The browser rendering persists profile details, journals and Supabase sessions in IndexedDB, encrypted with AES-GCM and a non-exportable browser-local key. The key lives in the same browser; this is not protection against an unlocked browser or same-origin malicious scripts. Storage failures do not silently fall back to temporary memory.
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

The browser preview is for interface review. Native encryption, microphone permissions, SecureStore recovery, audio sessions, Apple sign-in, notifications and backup restore still require a physical-device test. Browser data survives refresh and reopening at the same origin. Different browsers or URLs have separate local stores; clearing site data removes the local journal and sign-in. Existing journals in the original web app are unaffected.

## Connect and deploy Supabase

Project `gxuwmgztksktacwvdipy` (Tokyo) is connected. Six migrations, the sourced content seed, private storage and eight Edge Functions are deployed. Migration filenames match the remote history. Local ignored mobile environment files contain only the project URL and publishable key. The existing Sites preview continues to use its separate backend.

1. For another environment, select the intended Supabase project. Review the migrations, then apply all six files in `supabase/migrations/` using the Supabase migration workflow. Existing Sites/D1 migrations are separate and unchanged.
2. Run `supabase/seed-content.sql` in that project to populate the sourced catalog. `npm run content:sync` regenerates the native catalog and seed from the authored web sources.
3. Configure production Auth SMTP and the email OTP template to include `{{ .Token }}`. The native app verifies a code, not a magic-link-only email. Configure `awaychurch://auth` as the redirect scheme.
4. Deploy the eight edge functions. User functions verify the session with `auth.getUser`; the news endpoint is read-only; notification dispatch requires a separate server cron secret.
5. Configure only the services that will be enabled. `supabase/.env.example` lists server-side settings. Keep real secrets in Supabase secrets, never committed files. Generate a random 32-byte base64 key for Apple refresh-token encryption. Enable Apple sign-in in the app only after the native bundle ID, Apple provider and revocation flow are verified.
6. Assign an existing authenticated owner to staff using the project SQL editor: `insert into private.staff(user_id,role) values ('CONFIRMED-OWNER-UUID','admin');`. Never make staff assignment available to ordinary clients. Open `/staff` using that account.
7. For gatherings, configure LiveKit, confirm hosts and times, and test the host controls with two devices. Tokens authorize only an eligible member in the time window. Participants join muted. The app disconnects at the scheduled end; the protected notification scheduler also closes expired rooms when LiveKit is configured.
8. For email/push, verify the sender domain and mailbox, configure Resend and Expo push credentials, and schedule the protected `notifications-dispatch` endpoint. No schedule was activated and no emails were sent during development. Email is sent only to a consented address matching the authenticated, verified email. Delivery jobs use locks and stable email idempotency keys; push acceptance is not proof of delivery. Device receipt/error handling needs operational verification before release.

The deployed security review confirmed that all app tables have RLS and clients cannot read confession tables, increment AI counters, or rewrite comment text. Supabase still reports [intentional service-only tables without client policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [eight authenticated SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Those RPCs implement bounded community operations with explicit role/ownership checks and empty search paths; their access rules are covered by Postgres tests. These notices are documented rather than represented as a clean advisory report.

Official references: [Expo builds](https://docs.expo.dev/build/introduction/), [Supabase Apple sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [LiveKit Expo](https://docs.livekit.io/transport/sdk-platforms/expo/), [Apple account deletion](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

## Qwen journal guidance

`llm-journey` uses Alibaba Qwen Flash only to classify a theme and support flag. The server selects exact verse and action identifiers from the approved catalog; generated Bible quotations are never rendered. `llm-transcribe` uses Qwen3 ASR Flash for optional, explicitly requested M4A transcription (5 MB maximum). Text analysis requires a signed-in user, current per-entry consent and at most 30,000 characters. A compact guidance switch opens the consent details; the large inline consent card is removed. No AI request is made by opening the details or toggling the control; analysis still occurs only after submission. Names, email and city are omitted from AI requests. Audio transcription is editable before analysis. Entries are saved locally before AI is called, so provider failures preserve the journal.

The Alibaba key remains in Supabase as `alibaba_api_key`. `QWEN_BASE_URL` must match the key’s workspace and region; workspace-scoped keys require the exact endpoint shown in Model Studio. Usage limits are shared across both endpoints: 5 requests/minute/user, 30/day/user and 500/day/project. These are request limits, not a currency spending cap. No raw journal, recording or transcript is stored by our AI database code or logged by the functions; Alibaba and Supabase have their own processing/retention policies. Counters expire after two days and are cleaned on the next request. The local keyword gate is limited and is not a complete risk assessment or monitoring service.

The first live provider check is blocked: Alibaba returns HTTP 403 `AccessDenied.Unpurchased`, and its console reports `RISK.RISK_CONTROL_REJECTION`. The workspace-specific `QWEN_BASE_URL` is configured. Resolve the account restriction with Alibaba before considering AI live; no successful model output or transcription is claimed. The temporary synthetic diagnostic handler was replaced by the authenticated production function. The owner has submitted Alibaba identity verification and reports a review time of a few days; provider testing stays pending until approval.

Google Workspace SMTP uses `hello@findflockie.com` as sender with display name Grace & Gather; the public support address remains `hello@graceandgather.com`. Signup and returning-user email templates show `{{ .Token }}`. The latest sign-in attempts failed with Google SMTP `535 5.7.8 Username and Password not accepted`, including after the owner reported replacing the app password. The owner confirmed the Google account is `hello@findflockie.com`; Google Workspace credential acceptance remains unresolved. Do not mark delivery or full sign-in verified. The app now explains failures in the selected language, suggests corrections for common email-domain typos without changing them automatically, binds code verification to the receiving address, remembers the entered email without storing the one-time code, and shows a resend countdown. Successful sessions are persisted in the browser vault; live OTP delivery remains blocked independently of local persistence.

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

`release/readiness.json` contains the exact remaining launch gates. `npm run preflight --prefix mobile` loads the ignored mobile `.env`, reports missing values and exits nonzero. Existing shell/build environment values take precedence. Production EAS builds run that same gate; development builds remain possible. Public App Store support/privacy URLs must be accessible without the current private Site login. The supplied domain/email are not evidence that domain hosting or mail delivery is configured.

Automated checks include the existing 27 web/content tests plus Postgres RLS tests for profile isolation, moderation, impersonation, hidden content, rate limits, reservations, speaking permissions, reports, suspensions and notification recipients. Native TypeScript, ESLint, Expo compatibility, iOS/web Metro bundle export and Deno edge-function checks are run separately. A successful Metro export is not a signed iOS binary or proof of physical-device behavior.

The dependency audit currently reports no high/critical advisories; moderate findings stem from glob/minimatch in the Expo tooling dependency chain. Automated force-fix suggestions downgrade Expo and were not applied. Review compatible patched tooling before release. Actual production configuration, end-to-end authentication, real audio calls and notification delivery are not claimed verified.

## Confession community room

The web preview now has a separate anonymous peer-support room, theme-only selection, private single replies, and server-enforced six-hour reservations. Every confession and reply waits for human approval. `CONFESSION_MODERATOR_EMAILS` is a server-only verified-email allowlist; no client can approve itself. See [moderation and release notes](docs/CONFESSION.md). Native UI and the Supabase backend are deployed; a signed iOS build and device tests remain release steps.
