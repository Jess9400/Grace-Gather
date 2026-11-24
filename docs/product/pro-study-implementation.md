# Study workspace implementation

`/pro` is an authenticated app screen, reached from the Bible Study badge and a verse's Study tools row. Pricing and usage limits remain future proposals. The screen makes no AI requests and has no purchase gate.

- Profile-language UI supports English, Portuguese, Spanish and Russian. Readings use the selected cleared Bible collection.
- Six plans display actual chapter/range text and link to verse study. Per-account progress uses the existing encrypted device storage and does not sync between devices.
- Psalm plan numbering is mapped for Douay-Rheims, Brenton and Synodal.
- Seven original Grace & Gather reflections rotate by local date as a repeating starter week. They are not licensed scholarly commentary.
- STEPBible lookup loads 22,717 lexical entries on demand. Search supports accented/unaccented words, transliteration, English glosses and Strong IDs. Glosses are in original English and the UI discloses that.
- Context and source actions open existing verse study. Public discussions remain free.

## Import and licensing

Run `node mobile/scripts/import-stepbible.mjs` to download the official TBESG/TBESH TSVs. The importer records source URLs, hashes, attribution, CC BY 4.0 and transformations in `mobile/src/generated/stepbible/source.json`.

The TBESH header identifies short glosses as Tyndale scholars' work but includes a separate Online Bible permission notice for longer definitions. Longer definitions are excluded from both datasets. Only lexical forms, transliteration, grammar and short glosses are included. Source credits, transformations and license links appear in the STEPBible disclosure.

## Remaining boundaries

No paid commentary, billing or journal limits are enabled. Dictionary results are not automatically aligned to translated verse words. Existing incomplete full-Bible collections and source coverage remain incomplete, including Portuguese/Spanish Catholic collections. Missing plan passages show an unavailable message and cannot be marked read. Do not market this as complete professional theology coverage.

TypeScript, lint, lexical/progress/Psalm regression tests and web export validate this implementation. Physical iPhone reading, keyboard, accessibility and large-text checks remain before the next store update. No new backend deployment is required.

## Study workspace follow-up

- Shared back/Home navigation, more visible Pro entry points and direct opening of Study tools from a verse.
- Simple and Deeper remain on the verse page; Theology is reached through Pro tools. No subscription gate or pricing change in this update.
- Today shows the daily devotional and active reading only. Reading plans contains fourteen Scripture-based plans and a separate seven-day devotional plan. The devotional pairs Scripture, a reflection, prayer and one concrete action; progress is stored with existing account-scoped device progress.
- Historical context and sources open the corresponding reading panel directly, preserving the selected verse. With no supplied verse, tools start at Genesis 1:1 in the selected edition; Choose a passage opens the reader. Existing edition/source coverage limitations still apply. Source attribution and missing-content notices remain visible; no material is generated or invented to fill gaps.
- Public discussion uses the same tool-list row style and remains free.
- Added localized titles/actions in EN/PT/ES/RU. Added plan passage-bound and devotional progress regression coverage. Typecheck, lint and all 24 Bible/study tests pass.
