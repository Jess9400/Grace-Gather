# Pro membership and operating budget — Jessica/Taya review

26 November 2026. **Draft implementation only: not merged, deployed, charging or activated.** Replaces the older PR #88 proposal; do not merge that obsolete branch.

## Product decisions

| Feature | Free | Pro | Admin |
| --- | --- | --- | --- |
| Browse Pro page and tool descriptions | Yes, dismiss upgrade with × | Yes | Yes |
| Pro tools, reading plans, devotionals and new study notes | Upgrade required | Included | Included without payment |
| Guided journal entries | 1/day | 3/day | Subscription quota exemption |
| Journal follow-up replies | 1/day total | **3/day total, not per entry** | Subscription quota exemption |
| Ask AI, across study and dictionary conversations | Upgrade required | **60/calendar month** | Subscription quota exemption |
| Basic Bible, Simple/Deeper, public discussions, community/prayers/gatherings | Free | Free | Free |
| Read/export/delete existing personal writing | Always available | Always available | Own writing only |

Private writing/saving remains available when personalized guidance runs out. No draft is deleted; crisis support bypasses billing. `private.staff.role='admin'` is the only staff exemption; normal moderators do not inherit it. Client profile/JWT user metadata never grant membership.

Daily counters reset at **00:00 UTC**; study at **00:00 UTC on the first of each calendar month**, not subscription billing anniversary. The app shows the exact next reset in the reader's local date/time and language. Clock/language changes, reinstalls and switching entries cannot reset usage. Close × leaves Pro browsable; clicking a protected tool prompts again. Public discussion creation stays free. Existing notes remain readable/deletable after expiry.

## Pricing

| Storefront | Monthly target | Yearly target | Trial |
| --- | ---: | ---: | --- |
| Outside Brazil | US$5 | US$48 (20% less than 12 monthly payments) | 3 days, store-eligible new subscribers |
| Brazil | BRL equivalent of **US$2** | **Proposed for review**, not yet confirmed: BRL equivalent of US$19.20 if applying the same discount | Same |

Apple price points/taxes/exchange rates require choosing actual regional prices in App Store Connect. Brazil is determined by the **storefront**, not Portuguese or a profile country. Paywall price/currency and renewal period come from the store; trial copy appears only for a returned three-day offer and eligible buyer. Include restore, terms/privacy, auto-renewal/cancellation and subscription management. No card collection in this app.

## Public cost inputs, not measured invoices

- [Alibaba Qwen Flash](https://www.alibabacloud.com/help/en/model-studio/qwen-flash): Singapore/international input≤256k costs **$0.05/million input + $0.40/million output tokens**. Repository default only; live account/model/region must be verified. No free credits/cache discount assumed.
- [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/): model **30%** standard commission and **15%** under qualifying/Small Business terms. Our Small Business enrolment is not verified. Tax, regional and currency adjustments affect actual proceeds.
- [RevenueCat](https://www.revenuecat.com/pricing): free below $2,500 monthly tracked revenue, then **1% of tracked sales**, before Apple deductions.
- Supabase and Cloudflare remain on the owner's free plans. Below, **$25/month is an infrastructure planning reserve, not an incurred charge/purchase**. Audio/LiveKit, transcription, moderation, translation, email, licences, backups, tax, labour and support need separate budgets. No paid study licence was purchased here.

### AI assumptions

The visible response is not the whole input: journal map≈6.7 KB plus instructions, writing and bounded chat; study includes dictionary/edition context. Language, length, optional rewrite and failed requests vary. These are not measurements or hard maximums.

Reference journal request: 12,000 input + 650 output tokens ≈ **$0.00086**. Study reply: 8,000 input + 1,100 output ≈ **$0.00084** at the cited rate.

| Fully used allowance over 30 days | Requests | Reference text AI | Working budget |
| --- | ---: | ---: | ---: |
| Free: one entry + one follow-up/day | 60 | $0.0516 | **$0.08/member/month** |
| Pro: three entries + three follow-ups/day + 60 study replies | 240 | $0.2052 | **$0.25/member/month** |

The small cushions do not guarantee cost coverage. Test a stress case of **$0.15/free, $0.50/Pro** until real token totals are measured. Failed calls may cost money even when allowance is returned. Translation/transcription/moderation are separate. Existing per-minute/day/global abuse caps remain; 60/month is not 60 simultaneous requests. Cost analytics must exclude raw private writing.

### Revenue sensitivity

Example: 1,000 monthly active people: 900 free + 100 monthly Pro, everyone using every text allowance. Working AI budget=900×$0.08+100×$0.25=**$97**. With $25 infrastructure reserve=**$122**, before other expenses. RevenueCat is below its paid threshold in these examples.

| Paying members | Gross sales/month | After 30% Apple | Remaining after $122 | Margin on gross |
| --- | ---: | ---: | ---: | ---: |
| 100 Brazil ($2 equivalent) | $200 | $140 | **$18** | **9%** |
| 50 Brazil + 50 elsewhere | $350 | $245 | **$123** | **35.1%** |
| 100 elsewhere ($5) | $500 | $350 | **$228** | **45.6%** |

At 15% Apple, remaining amounts are $48 (24%), $175.50 (50.1%), $303 (60.6%). **Contribution estimates, not net profit:** excludes the unpriced operating costs above. Annual subscriptions reduce monthly-equivalent revenue to $4 outside Brazil; proposed Brazil annual equivalent $1.60. Trials earn nothing but cost money; measure trial-to-paid conversion.

At 100 active people with 10 monthly payers: AI working budget=$9.70. With the same $25 reserve and 30% Apple, all-Brazil sales leave **−$20.70**; all-$5 sales leave **$0.30**, before other costs. Current free infrastructure can reduce fixed spend but has capacity limits.

For ≥35% margin on gross sales, with 30% Apple+1% RevenueCat, remaining costs must fit within **34% of price**. After $0.25 Pro text AI, Brazil's $2 leaves **$0.43/payer** for free-user subsidy and all other costs, supporting about **5.4 fully active free people/payer before infrastructure**. $5 leaves $1.45, about 18.1 free people/payer before infrastructure. These are arithmetic thresholds, not predicted conversion. In the higher text-cost stress scenario even the mixed example drops well below 35%.

Recommendation: agreed daily limits + 60 monthly study replies, bounded prompts/answers, weekly aggregate cost review. Brazil-heavy adoption/low conversion may require revisiting regional pricing, trial policy or resource budgets **before** promising 35% profit. Never silently reduce a purchased allowance. No unapproved price increase/free-limit reduction in this PR.

## Release and verification checklist

- Expiring server entitlements; only server-to-RevenueCat verification can change them. SDK/client booleans never unlock the backend. Previously verified memberships are rechecked against RevenueCat after five minutes before paid AI requests, to reduce stale access if a webhook is missed. Current entitlement is `grace_gather_pro`.
- Dedicated authenticated webhook, current-state lookups and monotonic snapshot updates for duplicate/out-of-order events. Refund/expiry removes access; cancellation keeps paid-through access. Honour verified grace periods. Restore/account switching must not silently transfer another account's subscription or private data.
- Atomic request holds, idempotent replay, provider-error release; daily counters separate from monthly study counters. Safety responses bypass billing.
- Rollout starts **off** in the database, preserving the current live build until the new app and purchases are ready. This branch is a preview, not a production activation.
- Dictionaries/maps/devotionals are bundled assets, not server DRM. Tool UI is gated, and AI/study writes are enforced on the server. Preventing determined asset extraction requires a separate authenticated content-delivery project.
- RevenueCat project `63e3313e` exists with a test entitlement/products. Still required: real App Store configuration, dedicated purchase-verification key, Apple products/intro offers, regional prices, current offering, native public SDK key, server secret and webhook. No secret in Git. Do not ship a Test Store `test_` key. Sandbox access is off by default; enable only in an explicit test environment and restrict test users.
- Complete subscription configuration **before** the next TestFlight build; then test purchase/restore/cancel/refund/expiry/grace, trial eligibility, multi-device quotas, resets, failed replies, admin access, account switch and backend outage after successful purchase. Include subscription in Apple's submission; no implied Apple approval.
- Pending review decisions: Brazil annual price, verified Small Business status and acceptable subsidy/operating budget. Pricing/limits here do not alter the 61 approved devotionals.
