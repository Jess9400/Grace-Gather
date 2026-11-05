# Multilingual Scripture

Interface language and Scripture language are independent onboarding preferences. Readers and journal suggestions select the exact supported language, tradition and edition; an unavailable combination must show an availability message rather than substitute English or another tradition.

## Added publisher editions

- Portuguese: Bíblia Livre 2018, CC BY 4.0, https://ebible.org/porbr2018/copyright.htm
- Spanish: Reina-Valera 1909, public domain, https://ebible.org/spaRV1909/copyright.htm
- Russian: Synodal, public domain, https://ebible.org/russyn/copyright.htm

Each imported source contains 66 books. The Russian source does not include the additional Orthodox books. Portuguese and Spanish Catholic editions and additional Orthodox coverage remain unavailable. English collections retain their existing edition-specific coverage.

Publisher rights, source URLs and archive SHA-256 hashes are retained in generated assets. Reproduce with `python3 scripts/import-multilingual-bibles.py <archive-directory>` using the pinned official USFX archives named in the script. Text and numbering are preserved; publisher notes remain separate. An empty publisher verse marker remains empty with an explanatory note.

The three new readers load in separate language bundles to keep individual Cloudflare assets within its size limit. Suggested passages are tested against the corresponding reader text.

## Translation boundaries

Authored interface controls use the four-language dictionaries. Scripture is publisher text, never machine-translated. Member testimony and journal wording are unchanged. Discover items missing a translation show an original-language notice. Long English editorial Bible studies are replaced by localized general guidance in other interface languages pending reviewed translations.

Validation: root tests include source coverage, parser fidelity and exact-language recommendation selection. Mobile reader tests exercise interface/Scripture language combinations and edition links. Native signing, audio providers and LiveKit configuration are outside this change.
