# Daily devotionals and original-language study

Implementation based on main including Taya's #254 design. No subscription enforcement, prices or journal limits are changed.

## Actual readiness

The reader, dictionary/concordance, dated calendar, private history and review gate are implemented. The calendar has 365 distinct date/ID slots beginning 25 November 2026 and never wraps. **31 original devotionals are drafted in English, Brazilian Portuguese, Spanish and Russian; the remaining 334 have not been written. No devotional batch is approved. This is a draft PR, not a finished 365-day library.**

A user who finishes today's reading sees its completed state; re-entering does not manufacture a different devotional or erase it. The library is browsable by month with pagination. Future daily content is not shown to ordinary readers. If publication falls behind, an honest unavailable message and the existing library replace recycled content.

The old explicitly selected Seven days with God reading plan is preserved; it is a seven-day course, not the source for the daily calendar.

## Monthly review by Jessica and Taya

Manuscripts: `mobile/content/devotionals/year1/NN.json`. Each row has a stable day number (1–365), source passage and four localized versions `[title,reflection,action,optionalPrayer]`. A date belongs to its stable day, not its position in a file. Append new manuscripts without renumbering existing entries.

1. Read the passage in its surrounding chapter; check the reflection does not invent what God promises or turn a lexical meaning into a doctrinal proof.
2. Check all four versions for natural language and comparable meaning. Verify the action is distinct, achievable and does not pressure a vulnerable reader, promise healing or require unsafe contact/spending.
3. Optional prayers are clearly a human response. When absent, the reader is invited to pray in their own words or stay silent.
4. Both reviewers approve the exact file. In its `NN.review.json`, set each reviewer's approved flag, status `approved`, the review date, four languages and the source file's SHA-256. Changing the manuscript invalidates its approval. Do not enter approvals on somebody else's behalf.
5. Run `npm run devotionals:check` for full-year readiness. Until the year is complete, the compiler still validates each available batch, but the full-year command fails on purpose.

Local editorial build: `DEVOTIONAL_EDITORIAL_PREVIEW=true npm run build:web`. Default web/native build preparation excludes drafts. It never calls an AI provider. The preview label means no professional review has occurred.

No recurring automation, paid content generation, or unreviewed daily AI publishing was added. Future writing/review is an explicit editorial task, not an implied automatic service.

## Study tools

- 27-book Greek NT main reading and 39-book Hebrew/Aramaic OT from STEP TAGNT/TAHOT. Hebrew Torah included. These are original-language base texts, not complete Greek/Aramaic coverage of Catholic or Orthodox additions.
- Tap a word for source transliteration, dictionary lemma, brief English meaning and source morphology with localized descriptions of recognized grammar codes. This is a written pronunciation guide, not recorded speech.
- Concordance uses lexical IDs, preserving disambiguated senses; results are paginated and lead back to the source passage. Generic base Strong's IDs can also aggregate senses.
- Parallel reading uses explicit edition labels. Marked differences in source verse divisions prevent an asserted exact pairing. Where an automatic mapping is unavailable, the reader can independently choose the source passage. Russian pairing remains limited by the existing verified mapping, not guessed from an identical number.
- Existing professional and clearly labelled community reference notes remain available in Context, respecting source coverage and language fallback. Geography links lead to OpenBible reference maps, not invented in-app maps.
- Removed the generic Christian perspectives tile after feedback: it repeated the same information for every passage. The existing passage-specific Theology tool remains. Full multilingual theological coverage still needs licensed/reviewed sources.
- Sources remain expandable footnotes.

## Sources and reproducibility

`mobile/scripts/import-original-scripture.py` transforms the six STEP TSVs. Source SHA-256 hashes, license, attribution and transformations are recorded in `mobile/src/generated/study-original/manifest.json`. Dictionary uses the already imported brief STEP fields; restricted longer definitions remain excluded.

The main Greek N reading is selected once per word; alternative editions are not concatenated. Hebrew L/Q main readings are selected, while source numbering alternatives stay on the words. At places where one English verse spans two Hebrew divisions, retain both segments in source order.

Static files are sharded by chapter and Strong's hundreds. Native only fetches the selected chapter rather than loading the entire library into memory. Web exports include assets. No change to home/church graphics.

## Validation

TypeScript, Expo lint, web export, existing reader/study tests, seven new corpus/calendar tests, disposable PostgreSQL two-account tests and signed-in browser checks. The live backend was checked for the new private history table's permissions. No simulator or new TestFlight build requested.


## Shared study and contextual questions

The dictionary no longer starts at G3056. Ask AI replaces Discuss in the Pro tool grid and is available from a dictionary entry or tapped original-language word. It sends the selected passage, actual lexical entry and a bounded conversation to the existing Bible study service after permission. It does not browse live sources or replace scholarly review.

Notes use separate personal / devotional / reading-plan contexts, so the same verse can hold independent notes. Existing notes migrate as personal because their original writing context cannot be safely inferred. Notebook search has three sections; Reading plans includes private plan notes and explicitly shared snapshots, with author and plan labels. Devotional reflection and each plan reading contain their own editor.

Accepted reading partners can explicitly share a saved note, then comment in its private thread. Threads are available inside Read together, the plan reading, and Notebook → Reading plans. Leaving/unsharing revokes access and removes the corresponding shared threads, while private originals remain. Public-discussion handoff includes only the author's own note, requires preview/post through the normal composer, and excludes partner comments. Both participants still opt in by invitation/acceptance; existing Pro entitlement enforcement is deferred with pricing.

Today retains and shows all started, unfinished plans, not just the most recently opened plan. Account merges preserve all starts and each plan's furthest completed day.
