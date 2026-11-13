# Brazilian Portuguese Discover feed

The interface language chooses the story feed; the separate Bible language
setting is not changed. Portuguese community testimonies are included only
after the existing moderation process approves them. Published stories must
declare their original language, not a translation language.

Brazilian editorial stories need `lang: "pt"`, `sourceCountry: "BR"`, and
Portuguese title and summary. Brazilian publisher stories additionally need
`rightsStatus: "licensed"` or `"public_domain"` and the complete Portuguese
body. Store the source, author, original publication date, license terms and
source URL whenever available. Mark a featured date separately from the
original publication date.

The Portuguese feed endpoint is deployed, but this change does not add
publishers, acquire reproduction rights, or schedule a Portuguese import.
Before enabling a daily publisher feed, verify the source's terms and any
applicable syndication permissions, content suitability, authorship and dates.
Do not replace missing original stories with English translations or present
an older article as newly published.

Potential publishers to approach and evaluate:

- Canção Nova: https://formacao.cancaonova.com/testemunhos/
- Editora Ultimato: https://www.ultimato.com.br/

These are candidates, not connected sources. Ultimato's site states a
non-commercial, no-derivatives licence; obtain suitable permission before
reproducing or adapting its content in an app with a potential paid plan.

Discussions and chats remain multilingual. Their text is automatically
translated to the reader's interface language, with an option to see the
original. The app discloses that Alibaba Qwen processes the text, including in
private chats. Translations are held in the open screen's memory only; the
original messages remain unchanged. The separate translation service and
database guard have been deployed; a signed-in end-to-end test is still needed
before enabling this feature in the app.
Confessions continue to be matched by language and are not translated here.
