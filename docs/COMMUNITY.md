# Private Community moderation

The Community agent runs inside the existing Supabase Postgres database. It is
rule-based software, not an AI model or a human replacement. It installs no model
on a laptop, creates no new service subscription, and makes no requests to AI
providers. Existing database/storage/traffic usage still counts toward Supabase
quotas and billing. The old moderation Edge endpoints now only check these rules;
they do not import Qwen or send Community text outside the app backend.

## Publication rules

The authored versioned catalogue is shared/community-private-rules.json. Only
complete matching starter messages, matching topic titles and neutral public
names (Member, Friend, A friend) are automatically published. Case and whitespace
may differ; extra text, hidden characters, links, custom titles/names and all
other free-form messages are held privately. This does not classify held writing
as bad, unsafe or theologically incorrect. It has deliberately narrow coverage.
Most open-ended conversations will need a future reviewer or a more capable
privately hosted model. Held posts and appeals stay unpublished in the meantime.

Every public field is checked. Scripture reference labels are derived from the
bundled edition metadata, and linked verse numbers must actually exist in that
edition. Clients cannot inject unchecked public reference text. The server does
not guess equivalents between Bible editions.

Review runs in the same transaction as submission, including when a client
closes immediately. A report holds the reported item for all members. Held posts
cannot pass repeated checks automatically. Authors can remove their own posts;
removing a topic removes its replies. Existing account, block, rate-limit,
suspension, audit, privacy and deletion rules remain in force. The engine cannot
create staff roles, execute submitted instructions, read private journals or
change Confession content. It receives no terminal or laptop-file access.

## Rollout and stop control

Run node scripts/build-community-private-rules.mjs to reproduce the private
catalogue migration and native starter copy. Apply migrations
20261104200000_private_moderation_catalog.sql and
20261104200100_private_moderation_rules.sql after the existing Community schema.
The catalogue starts inactive. After permission/content checks, a privileged
administrator may set private.community_rule_config.active=true. Set it false
to stop automatic publication. Clients have no table or activation privileges.
No public build-time switch can enable a different moderation processor.

The native app reads community_moderation_status; missing metadata disables its
automatic-publication UI. It never falls back to example conversations after a
live failure. Demo mode remains explicit and independent. Pending text is visible
to the author and any authorized staff only, not to other members.

## Deployment status

The catalogue and private-rule migrations are deployed to the existing
Grace & Gather Supabase project, with private rules active. The deployed
community-moderate compatibility endpoint also uses only private database rules.
This change does not assign a human moderator or enable an external AI processor.

The hosted rollback-only check verified publication, custom-text privacy,
canonical references, reports and restricted privileges. Its synthetic accounts
and posts were rolled back. Automated validation passes 92 backend/content tests
and 19 native tests, plus native typecheck, lint and Edge Function type checks.

## Verification and limits

Tests cover allow-listed publication, unknown/unsafe payload holds, every public
field, spoofed scripture labels, real verse coverage, hidden text, reports,
rechecks, permissions, stopping/restarting, model-free endpoints and reproducible
catalogues. This is a private, inexpensive first stage. It is not a complete
moderator for unrestricted public discussions, and it cannot offer nuanced
judgment or promise error-free outcomes. Device and real-account staging checks
remain necessary before a public release.
