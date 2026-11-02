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

- Responsive journal, eight feelings, text input, microphone recording (maximum two minutes), audio upload (maximum 20 MB), playback, and audio download.
- Mixed text/audio entries, stored together in IndexedDB.
- Check-in → licensed scripture → curated reflection → one optional action → saved follow-up.
- Five passages per edition, selected by feeling; up to five visible on request. No AI interpretation of private text or audio.
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

Unavailable combinations never silently substitute another tradition or language. An English scripture language can be selected explicitly while keeping any interface language. This is a 30-passage devotional library, not a full Bible. See `SCRIPTURE_SOURCES.md` and in-app Sources & credits.

## Privacy and data lifecycle

- Journal text, audio Blobs, scripture snapshots, chosen action, and follow-up stay in this browser's IndexedDB. Preferences use localStorage.
- No analytics, journal uploads, cloud synchronization, AI service, external font, or tracking image requests are included.
- Browser-local storage is **not encrypted app storage**. Anyone with access to the browser profile can read it. Clearing site data or using an ephemeral browser profile can remove it. Exports include private content and should be stored securely.
- Local preview and the hosted site use different origins, so their browser storage is separate. Test entries are not uploaded with deployment.
- Exports are portable JSON backups with audio data URLs. Import/restore UI is not implemented yet.
- The hosted preview is owner-private. This access gate does not replace a production multi-user authentication, encryption, backup, and account-deletion design.

## Project structure

- `dist/index.html`, `dist/styles.css`: shell, responsive styling, accessibility, self-hosted original SVG assets.
- `dist/app.js`: views, IndexedDB, MediaRecorder, journal lifecycle, dialogs.
- `dist/core.js`: preference/edition matching, passage selection, text escaping, local safety gate.
- `dist/content.js`: original interface text, reflections, practices, story summaries in four languages.
- `dist/scripture.json`: verified scripture and provenance, distinct from original app-written text.
- `scripts/serve.mjs`: local static preview server.
- `tests/core.test.mjs`: 11 tests of content selection, coverage, localization, safety gate, input, and escaping.

## Before a wider launch

Select approved native-language Catholic and Orthodox editions and licenses; obtain theological and translation review; decide encrypted storage and multi-device accounts; test recording on physical iOS/Android devices; define human safety operations. Add moderated groups, vetted live opportunities, or AI transcription only with their necessary consent and operational controls. No reminders, registrations, donations, payment, or human support service is simulated in this MVP.

## Verification performed

- All 11 automated tests pass, including exact tradition/language filtering, all four localized contexts per quotation, supported/unsupported combinations, preservation of quotation text, local support detection examples, and escaping journal content.
- JavaScript syntax checks pass.
- Browser: text entry, selected action and follow-up persisted after reload; a generated one-second silent WAV uploaded and survived reload alongside its text with playback controls.
- Browser: Portuguese unavailable Catholic state, Russian Synodal selection, Spanish mobile interface, and English defaults checked.
- Responsive QA at 1440px and 390px. Mobile card clipping was reproduced and fixed; measured content width equals viewport width.
- Browser: explicit-risk typed test opens human-support guidance before saving or recommending content.
- Physical microphone recording and physical iOS/Android device behavior remain to be tested. Audio transcription is not implemented.
