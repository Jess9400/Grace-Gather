# Pro study proposal and prototype

Pro appears as a quiet gold badge in Bible Study and opens a study workspace with Today, Reading plans and Study tools tabs, daily devotional samples, six reading plans, original-language examples and pricing in a secondary sheet. Prices and allowances below are proposals. The prototype performs no billing, enforces no limits and includes sample plan progress for the current visit.

## Proposed offer

| Feature | Free | Pro |
| --- | --- | --- |
| Bible reading, community, prayer requests, gatherings, journal storage and export | Included | Included |
| Guided journal entries | Up to 1/day | Up to 3/day |
| Follow-up replies | Up to 2/day | Up to 10/day |
| Additional verse studies | Up to 1/day | Up to 5/day |
| Reading plans and devotionals | Starter samples | Full licensed/editorial collection |
| Original-language tools and premium commentary | Available existing references | Contracted resources when available |

Personalized requests are pooled at a proposed 30/month Free and 150/month Pro. See [cost and source model](pro-costs-and-sources.md) for token budgets, free-user subsidy and the 35% margin scenario. These require approval and server enforcement.

The prototype covers all four interface languages and tradition selectors. Licensed native-language commentary for every tradition remains a procurement requirement.

A devotional combines a Scripture reading, short reflection, prayer and optional practical step. A reading plan arranges passages into a sequence. Samples in the prototype demonstrate each format.

Pro costs a proposed USD $5/month or $48/year, paid annually. The latter is 20% below $60 and equals $4/month. Eligible new subscribers get a proposed three-day trial. App Store local prices and eligibility must come from StoreKit. A glow around the badge is static and preserves reduced-motion comfort.

At an assumed 15% Apple commission, proceeds are $4.25/month or $40.80/year before taxes, refunds, infrastructure, AI and licensing. At 30%, these become $3.50 and $33.60. For 100 monthly subscribers, $425 proceeds must fund all service costs and support free members. Licensing quotes and measured token use are required before calling these margins sustainable. Annual subscribers provide about $3.40/month after a 15% commission. The proposed caps constrain variable use, but are subject to load and cost measurement.

## Content requirements

Greek for the New Testament, Hebrew and Aramaic for relevant Old Testament passages. Each note must show source, translation edition, tradition, attribution and licensing. Distinguish lexical meanings, translator choices and theological interpretation. Use professional commentary and source-grounded answers. Access supports serious theological study, with no credential or professional qualification claim. Do not advertise uncontracted resources as available.

## Implementation checklist

- [ ] Obtain publisher and lexicon licenses covering display, offline use, translations and AI processing where applicable.
- [ ] Decide limits and treatment of previously free features before changing existing accounts.
- [ ] Add server-verified StoreKit subscriptions, restore purchases, expiration, refunds and billing retry handling.
- [ ] Enforce usage atomically on the server, including retries and concurrent devices.
- [ ] Confirm existing consent covers every new processing purpose and provider.
- [ ] Build sourced original-language tools and citation-backed study answers.
- [ ] Build persistent plan progress and devotionals in supported languages with editorial review.
- [ ] Use localized StoreKit pricing, trial eligibility, renewal disclosure, Terms, Privacy and Manage Subscription links.
- [ ] Verify VoiceOver, Dynamic Type, reduced motion, trial conversion, cancellation, restore and offline behavior.
- [ ] Measure AI tokens and infrastructure costs per active free and Pro user, then review pricing against licensing quotes.

## References

- Apple trial durations https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions
- Apple Small Business commission https://developer.apple.com/app-store/small-business-program/
- Apple subscription implementation https://developer.apple.com/app-store/subscriptions/
