# Full mobile Bible collections

The native reader bundles complete English book collections locally. Existing
short quotations and other languages in `dist/scripture.json` remain unchanged.
This import does not add translations in Portuguese, Spanish or Russian.

| Reader key | Text | Book entries | Chapters | Records |
| --- | --- | ---: | ---: | ---: |
| `web` | World English Bible, Protestant Edition | 66 | 1,189 | 31,098 |
| `dra` | Douay-Rheims American Edition, 1899 | 73 | 1,334 | 35,811 |
| `brenton` | Brenton Septuagint with a separately identified WEB New Testament and 2 Esdras supplement | 81 | 1,380 | 37,344 |

The Brenton collection includes 37,343 scripture records and one note-only
record, Proverbs 30:1. The publisher explains that its chapter 30 material is
located in chapter 24. The note must be displayed as a source note, not as
scripture wording.

## Sources and permission

All text comes from the primary eBible publisher archives. Their supplied
copyright notices identify the text as public domain:

- [Douay-Rheims rights](https://ebible.org/engDRA/copyright.htm)
- [Brenton rights](https://ebible.org/eng-Brenton/copyright.htm)
- [World English Bible rights](https://ebible.org/engwebp/copyright.htm)
- [World English Bible Updated supplement rights](https://ebible.org/engwebu/copyright.htm)

The original publisher rights HTML is retained in each new generated directory.
Attribution and license links are also present at collection and book level.
World English Bible is a trademark; the actual translation wording is not
rewritten or modernized by the importer.

The import is pinned to these downloaded archive SHA-256 checksums:

| Archive | SHA-256 |
| --- | --- |
| `engDRA_usfx.zip` | `f6560ec0cb95e8ed97207ca83298f0bda5c32261b9188844b2d7ecb6bfb67adb` |
| `eng-Brenton_usfx.zip` | `363300189c61b0378a13d75daa170e00dd6850057c65ee28c82c46a78f8a3554` |
| `engwebu_usfx.zip` | `d9a571c1c7e0458e62aa8dab52e68d004e8a0533c075ab9be01b35d0e0ea6f12` |

Publisher archives can change. The importer rejects a different checksum until
the changed source is explicitly reviewed and the snapshot pin updated.

## Catholic coverage

The Douay-Rheims collection contains all 73 books, including Tobit, Judith,
Wisdom, Sirach, Baruch, and 1-2 Maccabees. Esther has 16 chapters, Daniel 14 and
Baruch 6. Their longer passages stay within those books as in this edition.
The book picker uses Catholic collection order. The publisher's wording,
chapter/verse labels and Vulgate-based Psalm numbering are retained.

This is an older translation with archaic English. It is not NABRE, a newly
approved liturgical translation, or modern explanatory study material.

## Orthodox-facing collection and limits

The Brenton Old Testament includes the longer Septuagint books, Psalm 151,
1 Esdras, Prayer of Manasseh and 3-4 Maccabees. Letter of Jeremiah, Susanna and
Bel and the Dragon appear as separate source entries. Greek Esther uses `ESG`
and Greek Daniel uses `DAG`. The 53 Old Testament entries plus 27 New Testament
entries and one supplementary entry total 81 entries; **this is not an assertion of an 81-book Orthodox
canon**. Canon, ordering and the treatment of additions vary by church.

The New Testament is explicitly the existing World English Bible text. Its
loaders reference the existing WEB JSON files without duplicating or changing
them. Per-book metadata identifies the actual edition and links to that
edition's publisher pages.

This is an app-assembled reading collection, not a church-approved Orthodox
Bible or the Orthodox Study Bible. Brenton has no New Testament. It also does
not supply Slavonic 3 Esdras, often called 2 Esdras in English. The collection
therefore adds a separately labelled **2 Esdras (WEB supplement)**, all 16
chapters and 944 source verse records, from the publisher's full World English
Bible Updated edition. The publisher's
[2 Esdras introduction](https://ebible.org/engwebu/2ES01.htm) explains the
Slavonic naming and distinguishes this work from the Greek Septuagint. Its
translation, rights and source URL remain explicit at book level. This does
not make the supplement Brenton text or declare it canonical for everyone.

A separate Odes collection is not included. A bounded check of the official
Brenton, Updated Brenton (`englxxup`) and LXX2012 (`eng-lxx2012`) indexes found
no English Odes book. The `englxxup` USFX archive was also inspected directly.
The official WEB Protestant archive contains extra deuterocanonical source
books including 2 Esdras despite its 66-book reader selection, but no Odes.
The full WEB Updated archive supplies the accurately linked 2 Esdras source.
An independently reviewed English Odes source with reusable rights is still
needed. No new Odes anthology is assembled from unrelated verse selections.
The status of
4 Maccabees varies; inclusion preserves source coverage, not a universal
canonical claim. A church-specific collection and reviewed Orthodox New
Testament would require additional sourcing and editorial decisions.

The longer canon is explained by the
[Orthodox Church in America](https://www.oca.org/questions/scripture/canon-of-scripture).
That explanation is contextual research; its copyrighted commentary is not
bundled as translation text or study notes.

## Brenton Ezra and Nehemiah normalization

The publisher archive contains both combined Ezra-Nehemiah (`EZR`, 23 chapters)
and a separate Nehemiah (`NEH`, 13 chapters). The copies differ in wording,
numbering and transcription. To avoid mixing these copies or repeating the
same narrative, this collection consistently uses the combined source:

- Ezra in the reader uses original `EZR` chapters 1-10.
- Nehemiah in the reader uses original `EZR` chapters 11-23, displayed as 1-13.
- Nehemiah book metadata records `sourceBookCode: "EZR"` and
  `sourceChapterOffset: 10`, so citations open the exact publisher chapter.
- The separate `NEH` transcription is excluded.

For example, displayed Nehemiah 2:3 links to publisher Ezra-Nehemiah 12:3.
No words, footnotes or verse numbers are silently corrected. Only the book and
chapter identifiers are mapped for navigation. The notes about this mapping
are present in collection metadata as well.

## Data structure and reading references

Each collection provides `index.json` and `loaders.ts` under
`mobile/src/generated/bible-dra` or `bible-brenton`. Book files keep the existing
`{book, chapters}` shape, with verse arrays containing `id`, `number`, `text`
and `notes`. Number labels remain strings, including suffixes such as `1b` or
`72a`. The index additionally includes provenance, explicit coverage limits,
record counts and note-only verse IDs.

Each index book supplies:

- `sourceEdition`, `sourceBaseUrl`, `sourceBookCode`
- `sourceChapterOffset`, `sourceChapterDigits`
- `sourceLicenseUrl`, `sourceAttribution`

Use three chapter digits for Psalms and two for other books. Apply the source
chapter offset before padding the number. Native routes must preserve the
edition as well as `CODE.chapter.number`; a WEB verse or study note is not
interchangeable with a Catholic or Septuagint verse with the same numeric
reference. Footnotes are source notes, not new denominational commentary.

## Known source quality limitations

These are faithful imports of the pinned publisher snapshots, not independent
scholarly editions or exhaustively proofread transcriptions. For example, the
publisher's Douay-Rheims John 15:9 omits the phrase "Abide in my love" present
in other transcriptions; John 15:6 contains typographical errors. Both the USFX
and the [publisher's online chapter](https://ebible.org/engDRA/JHN15.htm) show
those readings. The importer preserves them and does not patch wording from
an unrelated source. These examples need resolution with a verified source
before presenting this as publication-ready Catholic text.

Publisher front matter, introductions, appendix and errata are not presented
as scripture or generated theology. Integrity tests confirm structure,
coverage, provenance, suffix labels and note separation; they do not certify
theological approval or the accuracy of every publisher transcription.

## Reproduce and validate

Download the primary publisher archives, then run the pinned importer:

```sh
curl -L --fail https://ebible.org/Scriptures/engDRA_usfx.zip -o /tmp/grace-dra.zip
curl -L --fail https://ebible.org/Scriptures/eng-Brenton_usfx.zip -o /tmp/grace-brenton.zip
curl -L --fail https://ebible.org/Scriptures/engwebu_usfx.zip -o /tmp/grace-webu.zip
python3 scripts/import-bible-collections.py --dra /tmp/grace-dra.zip --brenton /tmp/grace-brenton.zip --webu /tmp/grace-webu.zip
node --test tests/bible-collections.test.mjs
```

The existing `mobile/src/generated/bible` WEB assets are a prerequisite for
the composite New Testament. Re-running the importer with the reviewed
archives produces byte-identical assets. `--output-root` can write into a
separate directory containing a copy of the existing `bible` directory for
an independent comparison.
