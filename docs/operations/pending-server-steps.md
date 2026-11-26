# Pending server steps

Server changes merged into `main` that are not live until someone applies them.
Supabase does not deploy from GitHub automatically: migrations and edge
functions are applied by hand. When a step is done, tick it and add the date
and who did it. Remove an item once it is done and verified.

## Gathering host controls (#223, merged 23 Nov 2026)

Lets the host choose who can speak, mute everyone, and see raised hands first.
Apply in this order, before the next app build is released:

- [x] **1. Database migration.** Done 23 Nov 2026 by the owner. Apply
  `supabase/migrations/20261123120000_gathering_speak_mode.sql` (adds
  `public.gatherings.speak_mode`, default `invited`). It is idempotent. Check:
  `select speak_mode, count(*) from public.gatherings group by 1;` shows
  `invited`.
- [ ] **2. Deploy the `gathering-token` edge function.** From the repository root
  on the latest `main`:

  ```bash
  npx supabase functions deploy gathering-token --no-verify-jwt --project-ref <project-ref>
  ```

  Keep `--no-verify-jwt`: the function checks the user itself, and joining
  gatherings fails without it (see `supabase/config.toml`).
- [ ] **3. Test with two phones** on the new app build: create a gathering with
  "Only people I allow"; the second phone sees only "Raise hand"; "Allow
  speaking" lets it unmute; "Mute everyone" and "Let everyone speak" work live.

The function is safe before the migration (it then treats every gathering as
"everyone", as before), and an older app keeps working against the new server.

## Personal sentence in English and Portuguese journal replies (#225)

The journal reply gains one or two sentences written to what the person wrote,
above the verse. English and Portuguese for now. No database change.

- [ ] **1. Deploy the `llm-journey` edge function.** From the repository root on
  the latest `main`:

  ```bash
  npx supabase functions deploy llm-journey --no-verify-jwt --project-ref <project-ref>
  ```

  Keep `--no-verify-jwt`, as for `gathering-token` (see `supabase/config.toml`).
  It can go out together with `gathering-token` above.
- [ ] **2. Check on the next app build:** with AI replies on and the app in
  English, then in Portuguese, write a journal entry; a short personal
  paragraph appears above "A word for you". Spanish and Russian show the reply
  as before.

## Journal action priority

- [ ] Deploy `llm-journey` after merging the community-first action rules. Use the deployment command above. No database migration is needed.
- [ ] Release the matching app update for live availability checks. Verify that an eligible burden offers listening, an empty listening room offers the mapped independent step, and gratitude opens Pay it Forward.

## "Mute everyone" returns people to listening (#235)

Mute everyone now takes speaking permission away in every gathering, so people
cannot switch their microphone back on until they raise a hand and the host
allows them, or the host chooses "Let everyone speak". An "Everyone" gathering
becomes "Only people I allow" when muted. Found in a two-phone test on
24 Nov 2026. Server-side: works on the current app build once deployed.

- [x] Deployed gathering-token version 12 to production on 24 November 2026.

- [ ] **2. Two-phone check:** in an "Only people I allow" gathering, allow the
  second phone to speak, tap Mute everyone, and confirm the second phone shows
  only "Raise hand" until allowed again.

## Guest speakers (#236)

Hosts can invite guest speakers through a private link, or mark someone as a
guest in the room. Guests can switch their microphone on at any time.

**Order matters:** the function reads the new columns, so apply the migration
first. Deploying the function before it would stop people joining gatherings.

- [x] **1. Database migration:** done 24 Nov 2026 by the owner in the SQL
  Editor. Apply
  `supabase/migrations/20261124120000_gathering_guest_speakers.sql` (adds
  `memberships.guest_speaker` and `gatherings.speaker_token`). Idempotent.
- [x] Applied the private speaker-link migration and deployed gathering-token version 12. Verified that ordinary clients cannot read the links table and that room actions require sign-in.

- [ ] **3. Two-phone check on the next app build:** the host taps "Invite a
  guest speaker" and sends the link; the second phone joins with it, shows
  "Guest speaker" and can unmute at any time, even after "Mute everyone".
  "Stop being a guest speaker" and "Make listener" take that away.

## Friend links (#242)

Members share a private link; whoever opens it and confirms becomes their
friend, without search and without being findable. No edge function.

- [x] **1. Database migration:** done 24 Nov 2026 by the owner in the SQL
  Editor. Apply
  `supabase/migrations/20261124150000_friend_invite_links.sql` (adds
  `private.friend_directory.invite_token` and `public.friend_invite_command`).
  Until it is applied, "Share my friend link" shows "Could not complete this".
- [ ] **2. Check:** "Share my friend link" on Your people, open the link on a
  second account, confirm "Add … as a friend", and both see each other under
  Friends.


## Study notebook and reading-plan invitations

- [x] Applied `study_notebook_and_plan_invitations` and `study_invitation_peer_identity` to production on 25 November 2026. Confirmed RLS, no direct client read access, and no anonymous RPC access.
- [x] Verified account note save/search/delete in the signed-in local preview and three-account consent/isolation behavior in disposable PostgreSQL.
- [ ] On the next app build, test with two real accounts: invite an accepted friend, accept from their own Read together screen, explicitly share a note, confirm the other account can read it, and leave/unshare to revoke access. No extra Edge Function is required.

## Bible Study progress on the account (#254)

Reading-plan days, "Seven days with God" and today's Read · Reflect · Pray
follow the account to a new phone or the web. No edge function.

- [x] **1. Database migration:** confirmed table and RPC live on 25 November 2026. Repository migration: `supabase/migrations/20261125120000_study_progress_sync.sql`
  (adds `private.study_progress` and `public.study_progress`). It is safe to
  run twice. Until it is applied, progress keeps working on each device as
  before; it just doesn't travel. Check: `select count(*) from
  private.study_progress;` runs (0 rows at first).
- [ ] **2. Check on the next app build:** start a plan and mark a day on the
  phone, then open Bible Study on the web with the same account; the plan
  shows the same day.

## Pro daily devotionals and original-language tools

- [x] Applied `20261125165504_daily_devotional_history.sql` on 25 November 2026. Confirmed RLS, no anonymous execution, no direct client table access and the public invoker wrapper. Local two-account tests pass; updates merge reading steps without erasing completion.
- [x] Confirmed the existing #254 study_progress table and RPC are already present on production. The older unchecked deployment item above is stale; remaining #254 work is the two-device app test.
- [x] First 31 four-language devotionals approved: Jessica explicitly confirmed both her and Taya’s approval on 26 November 2026. The review file includes the exact manuscript SHA-256. This is owner/editorial review, not a claim of professional theological review.
- [x] Batch 02 (30 entries, days 32–61, 26 December 2026–24 January 2027) approved; Jessica confirmed completion of the requested review on 26 November 2026.
- [ ] Write, translate and jointly approve the remaining 304 entries. The 365 date slots are a schedule, not 365 finished devotionals. `npm run devotionals:check` intentionally fails until the year is complete and approved.
- [ ] Merge and deploy only after the first editorial batch has been approved. Default builds omit draft content; a preview build must never be used for production distribution.
- [ ] Next phone build: check Greek/Hebrew glyphs, RTL Hebrew word order, word selection and concordance scrolling, then confirm history on a second device.

Original texts and concordance are versioned static assets deployed with the web build; no paid API or new AI calls are used. Native apps download only the selected chapter and a small concordance shard. Longer lexical definitions remain excluded under their separate permission notice. Full unverified verse-by-verse denominational coverage is not claimed.

## Pro shared study notes and Ask AI (draft #255)

- [x] Deployed `20261125185506_study_context_notes_and_comments.sql` and `20261125190219_study_personal_note_legacy_sync.sql`. Context notes and private comments have no direct client access. Invitations and comments create generic activity notices and use the existing member push queue; expired/blocked/revoked sharing is checked again before sending.
- [x] Local SQL tests cover context separation, opt-in sharing, comments from both participants, third-party denial, notification recipients, push eligibility, revocation, and compatibility with older clients. Personal note saves/deletes also update/delete the legacy copy.
- [x] Browser confirmed both active plans, blank dictionary search, Hebrew lookup, a real contextual AI answer, and separate notebook tabs. Ask AI uses the already deployed `bible-study` function with existing consent and server allowances; no new unbounded AI endpoint.
- [ ] Test on two devices after the app update: invite/accept, save a plan note, explicitly Share, open it under the plan or notebook → Reading plans, comment both ways, and check phone delivery. SQL verifies queue eligibility, not actual APNs delivery.
- [ ] Public handoff copies only the author's own shared note into the normal discussion composer; review and Post remain explicit. Partner comments remain private. Verify the final composer on a device without posting private test content.

## Pro memberships / paywall — draft, awaiting Jessica and Taya

Do not activate product limits on the current live build. The draft migration defaults `private.pro_rollout.enforced` to false.

- [ ] Review pricing/allowances and budget in `docs/product/pro-membership-paywall.md`; set the exact regional store price points (monthly US$6 globally / US$3.50 equivalent in Brazil; annual discount confirmed at 15%: US$61.20 globally / US$35.70 equivalent in Brazil).
- [ ] Finish RevenueCat real App Store configuration, products, three-day eligible introductory offer, regional prices and offering; agree restore/transfer policy and restrict sandbox access.
- [ ] Configure native **public** SDK keys for the next build; keep server secret/webhook authorization out of Git. Entitlement: `grace_gather_pro`.
- [ ] After review, apply `20261126102547_pro_membership_allowances.sql` and `20261126113552_pro_allowance_cache_cleanup.sql` before deploying `membership-sync`, `revenuecat-webhook`, updated `llm-journey` and `bible-study`. Keep enforcement off while testing.
- [ ] Validate the authenticated RevenueCat webhook and server lookups: purchase, restore, cancellation, expiry, refund, grace, renewal, transfer and repeated/out-of-order notices.
- [ ] Test next TestFlight build with free/Pro/admin accounts, quota expiry/reset, two devices, both store prices, trial eligibility and failed replies. Include subscriptions in Apple review.
- [x] Prepared four-language subscription/privacy wording and hourly cleanup migration in the draft PR; not deployed. Journal response copies expire at the next UTC day; study copies at the next UTC calendar month. Current-period records stay intact so cleanup cannot replenish allowances.
- [ ] After deployment, verify `grace-pro-cache-cleanup` in `cron.job` is active, its command/schedule match the migration, and a successful execution appears in `cron.job_run_details`. The migration fails if pg_cron cannot be installed, rather than silently claiming automatic cleanup. Review the deployed policy links alongside the real payment configuration.
- [ ] Only after the approved new version and purchases are available: explicitly activate the rollout, verify upgrade succeeds, and monitor costs. Nothing in this draft performs that switch.


**Launch interlock (Taya review feedback):** `EXPO_PUBLIC_PRO_BILLING_ENABLED` defaults to false in web and native builds. While false, Pro navigation does not call the new membership RPC or block people if the migration is absent; checkout and Restore are hidden. This is a deliberate pre-launch mode, not an outage fallback. When built with that flag true, the app also honours the server `enforced=false` switch. Once enforcement is true, unknown membership fails closed. Server access checks remain authoritative regardless of a modified client's build flag. Enable the app flag only for the payment-ready build; enable server enforcement only after that version is approved and purchases work. Both switches remain off in this deployment.
