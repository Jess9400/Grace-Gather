# Cloudflare shared staging

The `grace-gather` Worker in the Flockie Cloudflare account serves the Expo web
app at https://grace-gather.findflockie.workers.dev. It is a staging URL even
though Cloudflare calls the default deployment environment "Production".

## GitHub build settings

- Repository: `Jess9400/Grace-Gather`
- Branch: `main`
- Root directory: `mobile`
- Build command: `npm run build:web`
- Deploy command: `npx wrangler@4.157.0 deploy`

The repository root contains the older web prototype. Do not use its `build`
script for this deployment. `mobile/wrangler.jsonc` serves the exported `dist`
directory and falls back to `index.html` for direct app links and refreshes.

Set these **build variables** (not Worker runtime secrets):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Both values are intentionally public client configuration. Never put a
Supabase secret/service-role key, Alibaba key, Resend key, or LiveKit API secret
in an `EXPO_PUBLIC_` variable. The staging app currently uses the existing
Supabase backend, so its accounts and community data are shared with the app.

Leave `GRACE_GATHER_SITES_PREVIEW` unset: this deployment serves from `/`.
Do not enable automatic Community AI moderation as part of hosting setup.

Cloudflare must have a working GitHub connection for automatic builds. A
successful manual deployment alone does not verify that connection. Verify a
push-triggered build after reconnecting the repository. Enable branch previews
only after their build configuration and variables have also been checked.

The separate `codex/mobile-account-readiness` branch contains additional work
that has not been merged into `main`. Hosting configuration does not merge
those product changes.
