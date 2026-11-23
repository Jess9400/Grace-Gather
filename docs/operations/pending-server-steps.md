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
