# Grace & Gather: native app and retained web preview

Grace & Gather is the current working name. Public support contact: **hello@graceandgather.com** (mailbox verification is still outstanding). The original Still web preview and its browser journals are retained. The new `mobile/` app is a separate Expo / React Native application for iPhone, with optional Supabase accounts. The two account stores are not automatically merged. Existing storage keys, URL schemes and bundle identifiers retain their earlier technical names so the branding change does not reset device data or existing configuration.

## What is implemented

- A short optional Christian-tradition question first, then the floating-feelings home screen. The original language, name, intention, scripture, location and email preferences remain available through Account and settings.
- Home, Bible, Diary and More navigation. Floating feelings lead into a dated diary and a glass conversation with exactly one sourced verse plus three visible care actions. Follow-ups remain temporary curated reflections. More retains Explore, learning, Gatherings and the existing Confession room. Native recording and explicit Qwen opt-in remain in Writing options. Local word matching is limited to English; explicit feelings and neutral fallback work in all four interface languages.
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

The browser preview is for interface review. Native encryption, microphone permissions, SecureStore recovery, audio sessions, Apple sign-in, notifications and backup restore still require a physical-device test. Browser sign-in, preferences, and explicitly kept journal entries persist in an encrypted IndexedDB vault on this browser and origin. Unkept entries remain session-only. Clearing browser site data removes this local vault; the original web app uses separate storage.

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

`llm-journey` uses Alibaba Qwen Flash only to classify a theme and support flag. The server selects exact verse and action identifiers from the approved catalog; generated Bible quotations are never rendered. `llm-transcribe` uses Qwen3 ASR Flash for optional, explicitly requested M4A transcription (5 MB maximum). Text analysis requires a signed-in user, current per-entry consent and at most 30,000 characters. Names, email and city are omitted from AI requests. Audio transcription is editable before analysis. Entries are saved locally before AI is called, so provider failures preserve the journal.

The Alibaba key remains in Supabase as `alibaba_api_key`. `QWEN_BASE_URL` must match the key’s workspace and region; workspace-scoped keys require the exact endpoint shown in Model Studio. Usage limits are shared across both endpoints: 5 requests/minute/user, 30/day/user and 500/day/project. These are request limits, not a currency spending cap. No raw journal, recording or transcript is stored by our AI database code or logged by the functions; Alibaba and Supabase have their own processing/retention policies. Counters expire after two days and are cleaned on the next request. The local keyword gate is limited and is not a complete risk assessment or monitoring service.

The first live provider check is blocked: Alibaba returns HTTP 403 `AccessDenied.Unpurchased`, and its console reports `RISK.RISK_CONTROL_REJECTION`. The workspace-specific `QWEN_BASE_URL` is configured. Resolve the account restriction with Alibaba before considering AI live; no successful model output or transcription is claimed. The temporary synthetic diagnostic handler was replaced by the authenticated production function.

Google Workspace SMTP uses `hello@findflockie.com` as sender with display name Grace & Gather; the public support address remains `hello@graceandgather.com`. Signup and returning-user email templates show `{{ .Token }}`. Inbox delivery and a full user sign-in must still be tested before marking the release gate complete.

## Scripture and content coverage

| Scripture language | Protestant | Catholic | Orthodox |
| --- | --- | --- | --- |
| English | Full 66-book World English Bible | Full 73-book Douay-Rheims 1899 | Brenton Septuagint with separately labelled WEB New Testament and 2 Esdras supplement |
| Portuguese | Bíblia Livre (Feb 2018) | Not yet sourced | Not yet sourced |
| Spanish | Reina-Valera 1909 | Not yet sourced | Not yet sourced |
| Russian | Synodal NT selections | Not yet sourced | Synodal NT selections |

Unsupported combinations are explained; another tradition/language is never silently substituted. The journal retains 36 curated quotations plus Psalm 23/22 in six editions. The new mobile Bible reader additionally bundles full English book collections; see [Bible source and coverage notes](BIBLE_COLLECTIONS.md). `SCRIPTURE_SOURCES.md` records provenance. Final theology, translation, content-rights and age-rating reviews remain on the release checklist. News uses the past 24 hours of **publication timestamps**, not a claim about event dates. Courses, books, music and charities are independent external resources.

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

## Confession community room

The web preview now has a separate anonymous peer-support room, theme-only selection, private single replies, and server-enforced six-hour reservations. Every confession and reply waits for human approval. `CONFESSION_MODERATOR_EMAILS` is a server-only verified-email allowlist; no client can approve itself. See [moderation and release notes](docs/CONFESSION.md). Native UI and the Supabase backend are deployed; a signed iOS build and device tests remain release steps.

## Approved quiet-diary integration

The native app now implements the approved ivory prototype: #FFFCF3 background,
#FFFFFF reading surfaces, #302C28 text and buttons, and #B28A3E accents. The
Confession room retains its own original components and colors. No Confession
service, screen, recorder or playback code is restyled.

Home preserves gently floating feelings and respects reduced motion. Large
accessibility text uses a wrapping layout so choices remain reachable. Diary
drafts survive screen navigation. A single explicit finish action enters the
conversation. The original words and date remain separate from suggestions.
Exactly one curated quotation and three compact actions appear per response.
Follow-up text and conversation state are never written to journal storage.

Saving a page is optional. Kept native pages still use the existing encrypted
vault; unsaved pages remain in memory. Encrypted recordings may remain on the
device, but backups now include recordings referenced by saved journal pages
only. Backup format and existing saved pages remain compatible. Browser QA uses
temporary memory and does not prove native encryption, microphone, keyboard,
blur or backup behavior. Those checks still need a development build on a phone.

Bible reading is virtualized and loads successive chapters across books. A
book/chapter picker jumps directly. Scripture routes include the collection
identifier, keeping quotations, chapter context and citations within the same
source. Fourteen English editorial study notes cover all eighteen English diary quotations through explicit passage mappings, including Septuagint Psalm numbering. They are labelled as awaiting
theological review. Other verses offer reading questions and publisher notes,
not fabricated verse-specific commentary. Full non-English readers and church
calendars are not implemented.

The native design is implemented in React Native components, not a WebView.
The retained web prototype and its separate storage have not been replaced.


The tradition question is checked by the root navigator, including direct links.
Existing preview profiles without an explicit answer/skip version see the
question once after this correction. The stored reading tradition by itself is
not treated as the user's answer. Account, privacy and restore remain reachable.

Verse study presents a quiet overview with Simple, Deeper and Theology choices.
Each opens a focused reading sheet with context, meaning, everyday application
and reflection. Complete chapters open in a bounded, independently scrollable
window. Curated quotations keep their exact wording and
publisher links. Shared reflections use explicit aliases, never a guessed Psalm
offset or a theme-only match. The canonical notes live in shared/quiet-studies.json
and are copied by content:sync. English notes are not denominational approval.

The Courses and Books library exposes all six existing courses and seven
publisher-linked reading suggestions, including The Orthodox Way. Faith books
follow the explicitly chosen tradition by default, with an All perspectives
option. General wellbeing books remain in their own section. Author perspective
labels have linked sources and do not claim church approval. It opens from Bible,
More, verse study and conversation options. Full book text is not bundled. The
legacy Explore catalogue still includes twelve sourced items. In SDK 58,
href:null marks tab routes hidden and redirects navigation; secondary tab buttons
are instead hidden without disabling their routes. Confession content and
services remain unchanged.

## Church Home

Home opens at the church doors once per app launch: "Peace be with you", a
stone portal at dusk and two oak doors that open only when the person taps.
The doors swing inward and the view walks into a candlelit nave, then fades
into the church interior on Home. Both scenes, and the candle in a stone
alcove, are rendered in real time with Expo GL (WebGL in the browser). Geometry,
lighting, stone and stained glass are generated in code; the only image is the
walnut albedo already bundled for the Confession room.

The interior has tappable places, each with an accessible label projected onto
its object: Light a candle, Confession, Bible, Gather and Sit quietly (Journal).
The view drifts gently and follows a finger; it is still when the system asks
for reduced motion, and it pauses when Home is not visible. Evening light is
automatic after 18:00 and can be switched by hand. During Western Advent an
Advent wreath, violet banners and the week appear (not for the Orthodox choice;
week themes only for the Protestant choice). In development builds,
`/?advent=1`–`4` previews Advent. Every place is also listed as plain rows below
the floating feelings.

Candles are lit for oneself, someone loved, something carried or thanks. A
name is optional and stays in encrypted device storage until midnight. Each
candle shows a short prayer written for the app (awaiting review) and one
curated verse from the person's chosen edition. Tabs are now Home, Journal,
Bible Study, Confession and Gather; Discover and Chats open from Gather. The
Confession room is unchanged.

## Native Community

Community opens from More and Discuss this verse, using the approved quiet design.
Signed-in members choose a public display name and optional conversation perspective.
Their private profile and diary are never copied into posts.
Verse threads match exact collection and passage IDs, avoiding guessed links
between editions with different Psalm numbering.

Topics and replies are stored through authenticated Supabase RPCs and remain
pending until they pass the automated Community moderation check. Uncertain or
concerning posts stay private. Members can report, block, unblock and remove
their own posts. No human moderators are assigned by this change. A separate
staff queue remains available for a future review process. Account changes clear
cached community data. Failed submissions keep
the draft. Live API failures never fall back to sample conversations.

Local examples require EXPO_PUBLIC_COMMUNITY_DEMO=true without a Supabase connection.
That mode is labelled and uses memory only. Keep the flag false in real builds.
The two migrations and community-moderate function are deployed to the existing
Grace & Gather project. Automatic Community moderation remains disabled on both
client and server. No human moderator has been assigned. Posts stay private while
a private moderation setup is selected. See [Community deployment notes](docs/COMMUNITY.md).
