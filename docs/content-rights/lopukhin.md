# «Толковая Библия» (Lopukhin) — rights record

What the app shows: verse notes and chapter introductions from «Толковая Библия, или Комментарий на все книги Св. Писания Ветхого и Нового Завета», edited by A. P. Lopukhin (d. 1904) and his successors, St Petersburg, 1904–1913. It is shown only to readers of the Russian Synodal Bible, labelled with its title and date, and marked as public domain.

Files: `mobile/public/study-notes/v1/lopukhin/<BOOK>.json`, built by `mobile/scripts/import-lopukhin.py`.

## Rule used

A book is included only if all three hold:

1. Its commentator is agreed in the sources consulted (preface of the 2009 reprint, Православная энциклопедия, drevo-info, Wikipedia).
2. The commentator died in 1944 or earlier.
3. No record of Soviet repression with posthumous rehabilitation was found.

Anything that fails a test, or where the sources disagree, is left out. Nothing questionable is included.

## Why these books are free

- **Russia.** Civil Code art. 1281: life + 70 years. Transitional rule (Federal Law 231-FZ, art. 6): works whose 50-year term had expired by 1 January 1993 were not revived. Authors who died in 1942 or earlier have been free since before 1993. An author who died in 1944 was protected until the end of 2014, or 2018 with the war-time extension; either way the work is free now. Art. 1281(4) extends protection to 70 years after rehabilitation for repressed and posthumously rehabilitated authors; rule 3 excludes them.
- **United States.** Every volume was published 1904–1913, before 1931, so it is in the US public domain.
- **EU and other life + 70 countries.** Every included author died by 1944, so their terms ended by 2015.

## Included

| Books | Commentator | Died | Volume |
|---|---|---|---|
| Matthew | прот. М. П. Фивейский | 1919 | 8 (1911) |
| Mark, Luke, John | Н. П. Розанов | 1941 | 9 (1912) |
| Romans | Н. П. Розанов | 1941 | 10 (1912) |
| 1–2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1–2 Timothy, Titus, Philemon | Н. П. Розанов | 1941 | 11 (1913) |
| Jeremiah, Lamentations | Н. П. Розанов | 1941 | 6 (1909) |
| Malachi | Н. П. Розанов | 1941 | 7 (1910) |
| Joshua | Ф. Г. Елеонский | 1906 | 2 (1905) |
| Judges | И. Г. Троицкий | 1929 | 2 (1905) |
| 1 Chronicles, Job, Daniel | прот. А. В. Петровский | 1929 | 3, 4, 7 |
| Ecclesiastes | В. Н. Мышцын | 1936 | 5 (1908) |
| Ezra, Nehemiah, Hosea, Joel, Amos, Obadiah, Micah | В. П. Рыбинский | 1944 | 3, 7 |

N. P. Rozanov (1875–1941), lecturer at the Moscow seminary, is not the hieromartyr Nikolai Rozanov (1867–1938).

## Left out, and why

| Books | Reason |
|---|---|
| Genesis, Exodus, Numbers, Deuteronomy | Authorship disputed between Lopukhin, Eleonsky and A. I. Pokrovsky; Pokrovsky's repression record not found either way |
| Isaiah, Sirach | A. I. Pokrovsky: repression record not found either way |
| Leviticus, Ruth, 1–2 Kings (3–4 Царств), 2 Chronicles, Tobit, Psalms, Proverbs, Song of Songs, Nahum, Habakkuk, Zephaniah, Haggai, Acts, Catholic epistles | Attributed to прот. А. А. Глаголев (died in prison, 1937); whether he was rehabilitated is unknown. Psalms and Acts attributions also disputed |
| Ezekiel | М. Н. Скабалланович, rehabilitated 1989: protected in Russia until 2059 |
| Judith, Esther, 1–3 Maccabees | митр. Иосиф (Петровых), rehabilitated 1989: protected until 2059 |
| 1–2 Samuel (1–2 Царств) | свящ. В. И. Протопопов, rehabilitated 1957 and 1992: protected |
| Wisdom, Jonah, Zechariah, 3 Ezra, 1–2 Thessalonians, Hebrews, Revelation | Commentator's death date unknown |
| Book introductions, Daniel 13–14 and the Greek additions in Daniel 3 | Not printed in the app's Bible |

## Source text and changes

- **Source:** the per-verse OSIS transcription `lopukhin_commentary.xml` (GitHub `swmail/lopukhin_commentary`). Its wording follows the 1904–1913 edition in modern spelling, checked against the 1912 printing for John 3:16 and Romans 8:28.
- **Not the 2009 «ДАРЪ» reprint:** that edition is reworded and carries its own copyright, so it is not used.
- **Changes made:**
  - markup removed and dashes normalised
  - one transcription slip corrected against the 1912 printing (Romans 8:28)
  - one mis-keyed section moved (Romans 8:28–39)
  - Daniel 3:91–100 renumbered to the app's 3:24–33, because the app's Bible omits the Greek additions
- **Decision (16 November 2026):** the owner chose to use this transcription for the current release, and to replace it with the app's own Russian notes, written from these public-domain commentaries as sources, starting 17 November 2026.
- **Open question — database right:** the transcription carries no licence. Russian law (Civil Code art. 1334) gives the maker of a large database a 15-year right against extracting a substantial part. This transcription was last updated in 2014, which would put the end of that right around 2029. The commentary itself is free; this question is only about using this particular digital copy. Options:
  - ask the transcriber for permission
  - rebuild the text from the public-domain scans of the original volumes (archive.org `RUSTONK_DBS_HS`, marked Public Domain)
