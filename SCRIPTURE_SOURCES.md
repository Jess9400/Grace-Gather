# Scripture sources for Still MVP

Verified 2 November 2026. `dist/scripture.json` contains 36 manually checked, real Scripture quotations: five themes across six editions, including six additional passages for sadness. These are curated devotional selections, not an entire Bible or a generated translation. Each passage has its own source link and edition-specific reference.

| Edition | Language | App preference | Text and license |
| --- | --- | --- | --- |
| World English Bible, Protestant edition | English | Protestant | [eBible text](https://ebible.org/engwebp/), [public-domain declaration](https://ebible.org/engwebp/copyright.htm). The publisher identifies this as the 66-book edition. |
| Douay-Rheims, American edition of 1899 | English | Catholic | [Douay-Rheims Bible Online text](https://www.drbo.org/), [public-domain declaration for the 1899 edition](https://ebible.org/engDRA/copyright.htm). The traditional Catholic translation comes from the Latin Vulgate. |
| Brenton Septuagint, 1851 | English | Orthodox / Septuagint option | [eBible text](https://ebible.org/eng-Brenton/), [public-domain declaration](https://ebible.org/eng-Brenton/copyright.htm). This selection contains Psalms only. |
| Bíblia Livre, February 2018 | Brazilian Portuguese | Protestant | [eBible text and attribution instructions](https://ebible.org/porbr2018/copyright.htm), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This bundled text is taken exclusively from eBible’s February 2018 edition, which grants CC BY 4.0. The GitHub working repository separately labels its material CC BY 3.0 Brasil; the historical cause of this discrepancy is unverified. |
| Reina-Valera, 1909 | Spanish | Protestant | [eBible text](https://ebible.org/spaRV1909/), [public-domain declaration](https://ebible.org/spaRV1909/copyright.htm). Historical spelling is preserved. |
| Russian Synodal translation | Russian | Orthodox and Protestant | [eBible text](https://ebible.org/russyn/), [public-domain declaration](https://ebible.org/russyn/copyright.htm). The journal includes six New Testament passages; Explore adds Psalm 22. |

## Required presentation

- Always show the edition name, passage reference, source link and license/attribution access with a quotation. The app must use the actual `edition.language` to describe a quotation's language.
- Preserve the Bíblia Livre attribution and CC BY 4.0 link in the app, bundled data, and distributed exports containing its text. Attribution: “Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles — fevereiro de 2018.” Link the [authors' project](https://sites.google.com/site/biblialivre/), the [eBible source](https://ebible.org/porbr2018/copyright.htm) and [license](https://creativecommons.org/licenses/by/4.0/). No verse wording was changed.
- A faith preference is a filter for the available edition; it is not a claim that the edition represents every church in that tradition. Brenton was an English translator of the Septuagint, and this is **not** an official or universally endorsed Orthodox edition. The label must retain “Septuagint / Old Testament.”
- English has options for all three preferences. Portuguese and Spanish currently have Protestant texts only. Russian has the Synodal selection for Protestant and Orthodox readers. Native-language Catholic options in Portuguese, Spanish and Russian, and Orthodox options in Portuguese and Spanish, have **not** been bundled. Display unavailable combinations clearly or explicitly label an English fallback; never silently relabel a Protestant text as Catholic or Orthodox, or English text as a translated local-language quotation.
- Brenton references use the source's Septuagint numbering: Psalm 22:2, 4:9, 41:12, 106:1, 99:3 and 33:19. Do not substitute Masoretic/modern Protestant Psalm numbers.
- The source edition for the Synodal selection on eBible is a 66-book digital collection. Do not call the bundled selection a complete Orthodox canon. Synodal's history and use are broader than any single current edition; the journal contains shared New Testament passages and Explore includes Psalm 22.

## Transcription notes

Verse words and source punctuation were preserved. Verse numerals, footnote anchors, HTML markup, paragraph/line breaks and an opening speech quotation mark at a verse boundary are not part of the stored display text. Brenton Psalm 106:1 retains its “Alleluia.” heading because the source includes it within that verse. Russian verse line breaks were joined with spaces. Reina-Valera 1909 accents, including “á”, were preserved. No text was AI-translated.

Douay-Rheims John 15:9 was checked against [Douay-Rheims Bible Online](https://www.drbo.org/chapter/50015.htm), which includes “Abide in my love.” The eBible HTML consulted omitted that sentence, so it was not used as that passage's transcription source. All six Douay-Rheims passage links point to the checked DRBO text.

The selected short texts are either explicitly public domain or made available under CC BY 4.0. Future editions require their own verified text and reuse terms before being added; these permissions do not extend to unrelated modern Bible translations, publisher notes, or recordings.


## Sadness selections added 2 November 2026

- WEB: [Psalm 34:18](https://ebible.org/engwebp/PSA034.htm).
- Douay-Rheims: [Psalm 33:19](https://www.drbo.org/chapter/21033.htm).
- Brenton: [Psalm 33:19](https://ebible.org/eng-Brenton/PSA033.htm), retaining Septuagint numbering.
- Bíblia Livre 2018: [Mateus 5:4](https://ebible.org/porbr2018/MAT05.htm), with existing attribution and CC BY 4.0.
- Reina-Valera 1909: [Salmos 34:18](https://ebible.org/spaRV1909/PSA034.htm).
- Synodal: [От Иоанна 11:35](https://ebible.org/russyn/JHN11.htm), with original app-written context about Jesus sharing the grief surrounding Lazarus.

### External action resources

Links checked on 2 November 2026: [Positive News](https://www.positive.news/), [Action for Happiness groups](https://actionforhappiness.org/groups), and [NHS low-mood guidance](https://www.nhs.uk/every-mind-matters/mental-health-issues/low-mood/). Resource links are labelled as external and are not represented as in-app sessions, a guaranteed current 24-hour feed, or medical treatment. Still's prayers and actionable prompts are original writing.

## Explore Psalm reader

`dist/psalms.js` adds the complete six verses of Psalm 23 (Psalm 22 in Douay-Rheims, Brenton and Synodal). Checked 2 November 2026 against [WEB](https://ebible.org/engwebp/PSA023.htm), [Douay-Rheims](https://www.drbo.org/chapter/21022.htm), [Brenton](https://ebible.org/eng-Brenton/PSA022.htm), [Bíblia Livre](https://ebible.org/porbr2018/PSA023.htm), [Reina-Valera](https://ebible.org/spaRV1909/PSA023.htm), and [Synodal](https://ebible.org/russyn/PSA022.htm). The reader uses the selected edition and its attribution/license; an unavailable edition is never substituted. Verse numbering is displayed separately; formatting is normalized. Song links are adaptations, not exact scripture translations.

Explore summaries and context are original editorial paraphrases with official source links. Study interpretations are attributed to the publisher. No song lyrics, recordings, documentary files or BibleProject animations are redistributed. Catholic saint devotions appear only with the Catholic preference.
