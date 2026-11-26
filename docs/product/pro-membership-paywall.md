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

## Pricing — agreed 26 November 2026

| Storefront | Monthly target | Yearly target | Trial |
| --- | ---: | ---: | --- |
| Outside Brazil | US$6 | US$61.20 (15% less than US$72 across 12 monthly payments) | 3 days, store-eligible new subscribers |
| Brazil | BRL equivalent of **US$3.50** | BRL equivalent of **US$35.70** (15% less than US$42 across 12 monthly payments) | Same |

Both annual plans are billed once yearly. Monthly equivalents are US$5.10 globally and US$2.975 in Brazil; these are comparisons, not monthly charges for annual subscribers. Jessica confirmed both monthly prices and the 15% annual discount. Exact regional App Store price points remain to be selected; Brazil is charged in BRL, not dollars.

The annual option uses `gracegather_pro_yearly` with a Brazil-specific App Store price and the RevenueCat annual package. Before release, check both monthly and annual packages in each storefront, the actual localized amounts, and the three-day trial's eligibility and renewal terms. Do not invent a live BRL amount or advertise an exact discount unless the selected store prices support it.

Apple price points/taxes/exchange rates affect the available prices. Brazil is determined by the **storefront**, not Portuguese or a profile country. Paywall price/currency and renewal period come from the store. Include restore, terms/privacy and subscription management. No card collection in this app.

## Public cost inputs, not measured invoices

- [Alibaba Qwen Flash](https://www.alibabacloud.com/help/en/model-studio/qwen-flash): Singapore/international input≤256k costs **$0.05/million input + $0.40/million output tokens**. Repository default only; live account/model/region must be verified. No free credits/cache discount assumed.
- [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/): model **15%** target after Small Business enrollment/approval; **30%** standard contingency until the reduced rate is verified. Enrollment/effective date are not yet verified. Tax, regional and currency adjustments affect actual proceeds.
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

### Revenue sensitivity — revised agreed prices

Reference: 1,000 fully active members: 900 free + 100 Pro. Text AI working budget=900×US$0.08+100×US$0.25=**US$97/month**. Add a US$25 infrastructure reserve=**US$122**, before other expenses. These examples remain below RevenueCat's paid threshold.

| 100 monthly paying members | Gross/month | After 15% Apple | Remaining after US$122 | Margin on gross | Remaining at 30% Apple |
| --- | ---: | ---: | ---: | ---: | ---: |
| All Brazil (US$3.50 equivalent) | US$350 | US$297.50 | **US$175.50** | **50.1%** | US$123 |
| 50 Brazil + 50 elsewhere | US$475 | US$403.75 | **US$281.75** | **59.3%** | US$210.50 |
| All elsewhere (US$6) | US$600 | US$510 | **US$388** | **64.7%** | US$298 |

These are contribution estimates, not net profit. Audio, transcription, translation, moderation, taxes, licensing, labour and other operating costs are additional. The 15% scenario requires Small Business approval and the effective reduced rate; 30% remains the pre-approval contingency. Individual developers can apply. Apple evaluates annual proceeds across all apps and associated developer accounts; the limit is not US$1m monthly recurring revenue. [Small Business Program and enrollment](https://developer.apple.com/app-store/small-business-program/).

For 100 annual subscribers under the same usage assumptions, monthly-equivalent gross revenue is US$297.50 (all Brazil) or US$510 (all global). At 15% Apple, after US$122 reference costs, the remainder is US$130.88 (44.0% of gross) or US$311.50 (61.1%). This spreads annual proceeds over 12 months; it is not a monthly cash payout schedule. Trials bring no subscription revenue during the trial.

At 100 active members / 10 monthly payers and the same US$25 reserve, text AI working budget=US$9.70. At 15% Apple, all-Brazil sales leave **−US$4.95/month**; all-global sales leave **US$16.30**, before unpriced costs. Current free infrastructure can reduce fixed spend but has capacity limits.

For a 35% margin on gross, after 15% Apple + 1% RevenueCat, other costs must fit within 49% of price. Subtracting US$0.25 Pro text AI leaves US$1.465 for each Brazil monthly payer or US$2.69 for each global monthly payer to cover free-user subsidy and every other expense. At 30% Apple, those amounts fall to US$0.94 and US$1.79. Annual discounts reduce this headroom. In the stress case (US$0.15/free and US$0.50/Pro), the 1,000-member all-Brazil monthly scenario at 15% Apple leaves US$87.50, only 25% of gross, before other costs.

Recommendation: the agreed prices provide more room than the earlier US$2/US$5 proposal, but a 35% net-profit goal still needs measured total costs and conversion. Keep the agreed allowances, bound AI inputs/outputs, and review aggregate costs without logging private writing. No automatic price increases or purchased-allowance reductions.

## Release and verification checklist

- Expiring server entitlements; only server-to-RevenueCat verification can change them. SDK/client booleans never unlock the backend. Previously verified memberships are rechecked against RevenueCat after five minutes before paid AI requests, to reduce stale access if a webhook is missed. Current entitlement is `grace_gather_pro`.
- Dedicated authenticated webhook, current-state lookups and monotonic snapshot updates for duplicate/out-of-order events. Refund/expiry removes access; cancellation keeps paid-through access. Honour verified grace periods. Restore/account switching must not silently transfer another account's subscription or private data.
- Atomic request holds, idempotent replay, provider-error release; daily counters separate from monthly study counters. Safety responses bypass billing.
- Rollout starts **off** in the database, preserving the current live build until the new app and purchases are ready. This branch is a preview, not a production activation.
- Dictionaries/maps/devotionals are bundled assets, not server DRM. Tool UI is gated, and AI/study writes are enforced on the server. Preventing determined asset extraction requires a separate authenticated content-delivery project.
- RevenueCat project `63e3313e` exists with a test entitlement/products. Still required: real App Store configuration, dedicated purchase-verification key, Apple products/intro offers, regional prices, current offering, native public SDK key, server secret and webhook. No secret in Git. Do not ship a Test Store `test_` key. Sandbox access is off by default; enable only in an explicit test environment and restrict test users.
- Complete subscription configuration **before** the next TestFlight build; then test purchase/restore/cancel/refund/expiry/grace, trial eligibility, multi-device quotas, resets, failed replies, admin access, account switch and backend outage after successful purchase. Include subscription in Apple's submission; no implied Apple approval.
- Pending review decisions: exact regional store price points, verified Small Business status and acceptable subsidy/operating budget. Pricing/limits here do not alter the 61 approved devotionals.


## Follow-up readiness audit — 26 November 2026

This is a code/checklist review, not a claim of a physical-device purchase test. RevenueCat setup and production activation remain paused for owner review.

### Verified in the review branch

- Type checking, lint and all 261 mobile tests pass again. Current PR checks pass. The preceding local database tests cover atomic daily/monthly allowances, retries, expiry, admin isolation and concurrent requests.
- Public discussion is outside the gated Pro tool grid. Existing notebook read/search/delete remains available after subscription expiry; editing or creating study notes requires Pro.
- All four supported UI languages have paywall/limit/reset text. Paid status follows the account; a Portuguese interface or Brazilian profile does not determine store pricing.
- Current main already has gathering-form corrections beside Create and a submission lock. Open PR #234 overlaps these changes; do not blindly merge the older branch. Open #226 is an older deployment record, not evidence of a new missing deployment. #227 proposes an older version-number-only change; choose the next actual release number when building instead of merging it blindly. #88 is superseded by this proposal.

### Remaining polish before a paid release

- [x] Added a compact **Profile → Membership** entry. Verified subscribers see their access-through date and Apple management link; iPhone Restore remains available. Admins see their exempt access without purchase controls.
- [x] Paid daily/monthly limits show the reset and a return action, without repeating benefits or inviting another purchase.
- [x] Website hides checkout/Restore, explains that subscriptions are purchased/restored in the iPhone app, and retains the Apple management link for subscribed members. Android billing is still unconfigured.
- [x] Prepared hourly expiry cleanup in `20261126113552_pro_allowance_cache_cleanup.sql`. Journal retry copies last through the current UTC day; study copies through the current UTC calendar month. Current usage rows stay intact. Local SQL verifies expired deletion, preserved quotas/retries, client denial and account-deletion cascade. Hosted scheduler registration/run verification remains pending deployment, not completed here.
- [x] Updated in-app and public Privacy/Terms in all four languages: Apple/RevenueCat billing data, temporary generated-reply copies and exact retention/reset schedule, trial eligibility, auto-renewal, management and account deletion. The deletion flow links to Apple and explicitly remains available without cancelling first.
- [ ] Measure actual model usage, translation/moderation/transcription and room-audio costs before treating the margin target as established. A low-Brazil price plus many free users is the main financial risk.

### Content still incomplete

- 61 distinct devotionals are finished and jointly approved, scheduled through **24 January 2027**. **304 remain to write, translate and review**. The schedule is not a finished 365-entry library. If new content runs out, current fallback retains the latest approved devotional; that does not satisfy the long-term no-repeat daily promise.
- Original-language dictionaries and original-text availability differ by book/edition; context and tradition-specific commentary do not have identical verse-by-verse coverage in every language. Label sources/coverage honestly and do not market universal scholarly coverage or newly licensed content.
- Confirm on the next physical-device pass: multiple active plans, plan/day progress across accounts/devices, shared-note consent/comments/invitation alerts, Hebrew RTL and Greek glyphs, map/passage loading and large-text layouts. Automated tests cannot establish notification delivery or native animation smoothness.

### Payment work after Jessica and Taya approve

Finish Apple/RevenueCat products, confirmed 15%-discount annual prices, three-day trial eligibility, offering, verification keys and webhook. Then deploy with enforcement off, make a TestFlight build and test real sandbox purchases/restore/renewal/cancellation/refund/account-switch and both storefronts. Update Apple subscription review details and privacy disclosures. Enable quotas only after the approved app and working purchases are available; do not strand current users behind a purchase that is unavailable.


Follow-up validation: 266 mobile tests pass, including paid/free/admin/web presentation rules; typecheck, lint and web export pass. Signed-in browser confirms Profile → Membership opens the closeable sheet. Real billing status cannot be exercised against the live database until the reviewed migration is deployed. No live billing or cleanup deployment occurred.


Deployment safety: `requireProAction` honours the server rollout flag. With enforcement off, existing members can continue using Pro tools while store setup is unfinished. Profile → Membership remains available for browsing the proposal, but no real prices or checkout are fabricated. The subscription switch must not turn on until purchases work in the approved app update.


**Launch interlock (Taya review feedback):** `EXPO_PUBLIC_PRO_BILLING_ENABLED` defaults to false in web and native builds. While false, Pro navigation does not call the new membership RPC or block people if the migration is absent; checkout and Restore are hidden. This is a deliberate pre-launch mode, not an outage fallback. When built with that flag true, the app also honours the server `enforced=false` switch. Once enforcement is true, unknown membership fails closed. Server access checks remain authoritative regardless of a modified client's build flag. Enable the app flag only for the payment-ready build; enable server enforcement only after that version is approved and purchases work. Both switches remain off in this deployment.
