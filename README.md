# Still — Spiritual reconnection MVP

Working name: **Still**. Built from the Spiritual Reconnection App brief and the request for text/audio journaling, Christian tradition preferences, and English, Portuguese, Spanish, and Russian. No onboarding or commercial model is assumed.

## Run locally

Requires Node.js 20 or newer; no package installation or build step is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Recording requires HTTPS or localhost, a compatible browser, and permission from the person using the app.

```sh
npm test
npm run check
```

## Implemented

- Responsive journal, nine feelings, text input, microphone recording (maximum two minutes), audio upload (maximum 20 MB), playback, and audio download.
- Mixed text/audio entries, stored together in IndexedDB.
- A mobile-first, four-screen journey: check-in → situation-specific scripture → a choice of relevant actions → action instructions and a saved follow-up. The opening screen immediately asks “How are you feeling today?”; scripture appears only after submission.
- Six passages per edition. Each new journey shows only one or two matching passages, with a direct sadness passage available in each supported edition. The preview requires an explicit feeling; no AI interpretation of private text or audio is claimed.
- Journal history, text/mood search, per-entry deletion, JSON export including base64 audio.
- Four complete interface languages. App language, scripture language, tradition, and edition are separate settings.
- Exact quotations with references, editions, source links, attribution, and edition-specific numbering. Historical entries retain snapshots of their original passages and reflections when preferences change.
- Three finite, sourced Discover stories; original prayer, gratitude, and optional one-minute quiet practice; everyday kindness ideas.
- Clear unavailable states for groups, listings, and unlicensed scripture combinations.
- A local keyword gate for explicit self-harm phrases in typed entries and follow-ups, prioritizing human support; manual support access. This is a limited safeguard, not reliable risk detection, monitoring, or clinical triage. Audio is not analyzed.

## Scripture coverage

| Scripture language | Protestant | Catholic | Orthodox |
| --- | --- | --- | --- |
| English | World English Bible | Douay-Rheims 1899 | Brenton Septuagint, Old Testament selections |
| Portuguese | Bíblia Livre (Feb 2018) | Not yet sourced | Not yet sourced |
| Spanish | Reina-Valera 1909 | Not yet sourced | Not yet sourced |
| Russian | Synodal NT selections | Not yet sourced | Synodal NT selections |

Unavailable combinations never silently substitute another tradition or language. An English scripture language can be selected explicitly while keeping any interface language. This is a 36-passage devotional library, not a full Bible. See `SCRIPTURE_SOURCES.md` and in-app Sources & credits.

## Privacy and data lifecycle

- Journal text, audio Blobs, scripture snapshots, chosen action, and follow-up stay in this browser's IndexedDB. Preferences use localStorage.
- No analytics, journal uploads, cloud synchronization, AI service, external font, or tracking image requests are included.
- Browser-local storage is **not encrypted app storage**. Anyone with access to the browser profile can read it. Clearing site data or using an ephemeral browser profile can remove it. Exports include private content and should be stored securely.
- Local preview and the hosted site use different origins, so their browser storage is separate. Test entries are not uploaded with deployment.
- Exports are portable JSON backups with audio data URLs. Import/restore UI is not implemented yet.
- The hosted preview has a private custom allowlist (owner plus the explicitly approved external viewer). This access gate does not replace a production multi-user authentication, encryption, backup, and account-deletion design.

## Project structure

- `dist/index.html`, `dist/styles.css`: shell, responsive styling, accessibility, self-hosted original SVG assets.
- `dist/app.js`: views, IndexedDB, MediaRecorder, journal lifecycle, dialogs.
- `dist/core.js`: preference/edition matching, passage selection, text escaping, local safety gate.
- `dist/journey.js`: situation-to-scripture/action mappings and four-language journey content.
- `dist/flow.css`: mobile-first layout, tap targets, and single-column screens.
- `dist/content.js`: original interface text, reflections, practices, story summaries in four languages.
- `dist/scripture.json`: verified scripture and provenance, distinct from original app-written text.
- `scripts/serve.mjs`: local static preview server.
- `tests/core.test.mjs` and `tests/journey.test.mjs`: 16 tests of content selection, coverage, localization, safety gate, input, and escaping.

## Before a wider launch

Select approved native-language Catholic and Orthodox editions and licenses; obtain theological and translation review; decide encrypted storage and multi-device accounts; test recording on physical iOS/Android devices; define human safety operations. Add moderated groups, vetted live opportunities, or AI transcription only with their necessary consent and operational controls. No reminders, registrations, donations, payment, or human support service is simulated in this MVP.

## Verification performed

- All 16 automated tests pass, including exact tradition/language filtering, all four localized contexts per quotation, supported/unsupported combinations, preservation of quotation text, local support detection examples, and escaping journal content.
- JavaScript syntax checks pass.
- Browser: text entry, selected action and follow-up persisted after reload; a generated one-second silent WAV uploaded and survived reload alongside its text with playback controls.
- Browser: Portuguese unavailable Catholic state, Russian Synodal selection, Spanish mobile interface, and English defaults checked.
- Responsive QA at 1440px and 390px. Mobile card clipping was reproduced and fixed; measured content width equals viewport width.
- Browser: explicit-risk typed test opens human-support guidance before saving or recommending content.
- Physical microphone recording and physical iOS/Android device behavior remain to be tested. Audio transcription is not implemented.


## Mobile journey revision (2 November 2026)

- Sadness: a passage about sorrow/comfort → prayer, a gentle walk with personally chosen music, or reaching out.
- Losing hope in the world: hope scripture → Positive News, an act of kindness, or arranging a reading/conversation visit with an older person.
- Anxiety, loneliness, overwhelm, gratitude, peace, hope, and uncertainty each have their own path. The person can correct the selected feeling before choosing an action.
- Exactly quoted scripture and its source remain separate from app-written reflections and prayers. No inference of a diagnosis.
- New flow, actions, and copy support English, Portuguese, Spanish and Russian. Scripture coverage remains as listed above.
- The existing IndexedDB store is retained; old entries and audio are not migrated or deleted.

### Still pending for the requested AI experience

The OpenAI Developers plugin was offered but has not been confirmed installed/connected. No API key is configured and no journal text or audio is sent to an AI provider. The current published revision is an explicitly labelled, feeling-selected preview. Genuine interpretation must not be represented as complete.

When the connection is enabled, use its API-key setup workflow, migrate the static Site to a server-capable starter while preserving Site identity/audience, and keep the API key server-only. An authenticated endpoint should transcribe opted-in audio, interpret the journal in the selected language, and return a validated situation plus an empathetic reflection. Select verse IDs and action IDs from the verified catalog, never let the model invent Bible text or live events. Let the person correct the interpretation. Include clear per-entry disclosure/consent before sending private journal text/audio; handle unavailable AI and failed transcription without losing the draft or silently pretending to personalize.

[Official structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs) and [file transcription documentation](https://developers.openai.com/api/docs/guides/speech-to-text) were checked while preparing this change.

Friday sessions require an actual host, schedule, moderation and joining integration. They are labelled planned; no recurring schedule is claimed. External groups at Action for Happiness are explicitly separate from Still and from depression treatment. The good-news link is an English-language publisher, not an automated past-24-hours video feed. A live feed, licensed/approved music, and locally vetted charity/volunteer listings remain to be connected.

Validation for this revision: 16 automated tests; browser check-in → verse → action → follow-up and persistence after reload; distinct sadness and loss-of-hope paths; four-language and mobile-width checks. Physical-device recording and live AI remain unverified.
