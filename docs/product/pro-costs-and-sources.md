# Pro costs, limits and content procurement

Research checked 24 November 2026. This is a planning model. No licenses have been bought, no quotes have been received, and no usage caps are active. Both published plans must cover English, Portuguese, Spanish and Russian and Catholic, Protestant, Orthodox and exploring profiles. Do not sell a language/tradition combination with materially missing Pro features.

## Margin definition and budget

Target operating contribution is 35% of subscription sales before income tax, after store commission and allocated service, editorial and licensing costs. Salaries, legal costs, acquisition spending, indirect taxes and refunds must also be added for a true net profit measure. The example is not a guarantee of net profit.

The conservative annual-plan basis is $48/12 = $4/month. Assuming the Apple Small Business Program's 15% commission, $0.60 goes to Apple. At least $1.40 must remain for the 35% target. All remaining costs together must stay at or below $2.00 per subscriber-month. The $5 monthly plan allows $2.50 of remaining costs. At 30% commission the annual allowance falls to $1.40, so the sample below fails the target.

## Recommended starting allowances

| Meter | Free | Pro |
| --- | --- | --- |
| Guided journal entries | Up to 1/day | Up to 3/day |
| Follow-up replies | Up to 2/day | Up to 10/day |
| Newly generated verse explanations/questions | Up to 1/day | Up to 5/day |
| All personalized AI requests combined | 30/month | 150/month |
| Eligible trial | — | 10 AI requests total across 3 days |
| Previously saved content, Bible reader, published study material, plans and devotionals | Unlimited reading | Unlimited reading |

Monthly limits are pooled across the three AI features. Entry saves remain unlimited. A journal verse/action generated in one response counts once. Unsuccessful user requests restore their entitlement, while paid upstream failures still consume the operator cost budget. New limits require product approval, clear user-facing allowances and treatment of existing users. This revises the earlier daily-only proposal. Never suggest that every daily maximum can be used every day alongside the monthly cap.

## Token envelope and cost calculation

Planning rate from Qwen Plus international, non-thinking tier up to 256K input is $0.40/million input and $1.20/million output. Model aliases, region and rates must be confirmed against the production endpoint before enforcement. Assume a strict total of 4,000 input tokens and 600 output tokens per request, including system instructions, retrieved sources, conversation history and internal output. Each request costs $0.00232. Thinking models require their own output/thinking budget and price. Shared source retrieval, persisted authorized notes, compact history and cached public translations reduce repeat charges. Never share caches of private journal or private chat content between users.

| Monthly allocation per paid subscriber | USD | Basis |
| --- | --- | --- |
| Pro personalized AI | 0.348 | 150 requests at $0.00232 |
| Support for 5 active free accounts | 0.348 | 5 × 30 requests at $0.00232 |
| Hosting, database, storage, audio and email | 0.300 | Budget allocation, verify with actual invoices |
| Moderation, community translation and trial abuse allowance | 0.150 | Budget allocation, independently meter |
| Content license allocation | 0.250 | Maximum planning allowance, not a supplier quote |
| Editorial review and multilingual content | 0.300 | Allocation, actual people costs may exceed it |
| Retries, refunds and operating reserve | 0.200 | Budget allowance |
| Total excluding Apple | 1.896 | Must remain below $2.00 annual-plan threshold |

Annual-plan contribution is $4 − $0.60 − $1.896 = $1.504/month, or 37.6% of sales. Monthly-plan contribution is $5 − $0.75 − $1.896 = $2.354, or 47.08%. For 100 annual subscribers plus 500 fully active free users, monthly-equivalent sales are $400, Apple $60, remaining modeled costs $189.60 and contribution $150.40. This assumes all fixed costs fit within those allocations and the small-business commission applies.

At 30% Apple commission annual margin falls to 22.6%. At twice the token envelope it falls to 20.2%. At ten fully active free users per paid subscriber it falls to 28.9%. Therefore daily count limits alone cannot ensure the target. Measure monthly request costs and free-to-paid ratios. The model tolerates roughly 6 active free users per annual payer at maximum free use before falling below 35%, with every other assumption unchanged. At 10 Pro payers, a $25 database plan alone is $2.50/payer and breaks the model.

Operational gates should cap Pro personalized model spend around $0.35/month at this rate and trial spend around $0.025, subject to how many real source tokens each operation needs. Large deeper-study requests must count multiple credits or have a lower count allowance. Never silently truncate the user's journal to fit this envelope. Surface an understandable size limit before sending. Limit audio duration, cache shared translations, budget community AI separately and meter all provider invoices. If contracted royalties, staff time or usage exceed the model, renegotiate scope, allowances or price before selling. A flat license of $100/month needs 400 payers to fit the $0.25/payer license allocation.

## Source and licensing shortlist

| Candidate | Purpose and fit | Access/licensing needed | Published cost or quote status |
| --- | --- | --- | --- |
| STEPBible Data, Tyndale House origins | Greek/Hebrew text tags, morphology and lexicons shared across traditions | Download selected datasets with CC BY 4.0 attribution, links and recorded changes. Inspect each file and underlying text permissions. Prefer scholarly lexical datasets; some other repository datasets disclose AI generation. Localize glosses with review. | $0 license fee for eligible CC BY datasets. Hosting/localization costs remain. No paid API needed for downloaded data. |
| API.Bible / Digital Bible Library | Multilingual Bible text delivery, with translation-specific licenses | Commercial/freemium plan and individual version clearance. Confirm country, canon and language availability. Bible text access does not supply professional commentary. AI training restrictions apply; separately confirm inference/retrieval and translation permission. | API.Bible publicly shows a $25/month Lockman commercial translation bundle for 0–1K monthly users on its Pro Commercial plan. This is one bundle, with plan charges and additional publishers to confirm. The full four-language/three-tradition package still needs a quote. |
| Biblica via licensed partners / API.Bible | NIV/NVI families and available open-license editions for Protestant study | Version-specific permission. Request exact EN/PT/ES/RU availability, excerpts, offline caching, paid access and AI processing. | Quote required for selected commercial versions. Open-license editions must be checked individually. |
| Crossway ESV / ESV Study Bible | English Protestant text and possible study-note collection | The public ESV API is for noncommercial use. Request separate commercial Bible and study-note rights, including any translated notes. | Quote required. A personal subscription or book purchase grants no redistribution rights. |
| NET Bible / Biblical Studies Press / HarperCollins Christian Publishing | English translator notes, textual and linguistic study | Public verse API exists. Request commercial full-note redistribution and permission for localized presentation and AI retrieval. | Quote required. Free verse endpoint does not establish rights to the full notes. |
| Ignatius Catholic Study Bible / RSV-2CE | Catholic scholarly commentary and English Catholic text | Request app license for commentary separately from Scripture, all four display languages, digital/offline rights and AI use. | Quote required. Retail book/app prices are not commercial licensing prices. |
| Orthodox Study Bible / Thomas Nelson | Orthodox study commentary and text | Request rights for notes, Septuagint/NKJV components, languages and AI use. Existing translations of notes require their own agreement. | Quote required. No approved public commentary API or redistribution rate verified. |
| OCA / Greek Orthodox Archdiocese | Optional Orthodox devotional/editorial partners | Explicit written republication and translation permission. Their public websites require permission. | Quote/permission required. No content syndication API verified. |
| Licensed PT/ES Catholic publishers | Catholic study notes and complete cleared translations for Portuguese and Spanish | Procurement gap. Contact rights holders for a suitable Catholic commentary/translation in each language, with broader translation rights for Russian where needed. | No supplier quote or universal API verified. Track this as a launch gate. |
| Russian Orthodox commentary partner | Russian scholarly/patristic notes | Procurement gap. Require a cleared digital edition, translation rights for other interface languages, and legal reuse documentation. | Quote required. Do not reinstate previously unconfirmed database rights. |
| Original Grace & Gather devotional collection | Daily readings/reflections/prayers in all four languages | Commission or author original content with written rights and theological/native-language review. A scheduled content calendar prevents per-user AI generation charges. | No external API required. Budget real editorial cost before promising daily freshness. |

The published $25 Lockman bundle is only a translation subset. The total contracted package remains unknown until quoted. The $0.25 license and $0.30 editorial allocations above are spending ceilings in a scenario, not vendor estimates. If no supplier accepts those economics, the $5/$48 plan must use cleared open resources plus adequately budgeted original content, or change its price/scope.

## Language and tradition parity

The prototype includes four interface languages, six reading plans, seven daily rotating devotional samples, Greek/Hebrew/Aramaic lexical samples, historical context and tradition selection. These are demonstrative original samples. They do not establish licensed full-coverage study. The seven-day set repeats after seven days. Production requires a dated calendar with at least 90 days of reviewed devotionals and content refresh scheduling. Plan progress is temporary in the prototype.

For every EN/PT/ES/RU × Catholic/Protestant/Orthodox combination, record complete canon/versification support, localized source notes, Greek/Hebrew/Aramaic tool labels and glosses, licensed commentary, reading plans, daily devotionals and source/AI disclosures. Exploring profiles compare attributed traditions. Shared reading-plan samples use common books. Production needs tradition-specific calendars/canons and carefully attributed disagreements. All twelve combinations currently have a full licensed-commentary procurement gate. No English fallback should be presented as equivalent to full native-language coverage.

## Procurement questions

Ask each supplier for the exact edition, languages, regions, app embeds, per-verse and whole-book display, offline retention, royalties/minimum guarantees, active-user metering, four-language translation, excerpts, source-grounded AI inference, embedding/indexing, user exports, contract termination and correction handling. Do not send inquiries or buy licenses without the owner's instruction.

## Sources

- https://www.alibabacloud.com/help/en/model-studio/model-pricing
- https://developer.apple.com/app-store/small-business-program/
- https://supabase.com/pricing
- https://github.com/STEPBible/STEPBible-Data
- https://api.bible/terms-and-conditions
- https://care.api.bible/article/396-licensing-policies-quick-reference
- https://care.api.bible/article/405-express-licensing-faqs
- https://www.biblica.com/permissions/
- https://api.esv.org/
- https://www.crossway.org/permissions/digital/
- https://labs.bible.org/api_web_service
- https://netbible.com/copyright
- https://ignatius.com/permission-requests/
- https://www.thomasnelsonbibles.com/permissions/
- https://www.oca.org/contact
- https://www.goarch.org/-/terms-of-use
