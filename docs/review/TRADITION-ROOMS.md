# Tradition-specific church rooms

Review branch based on #26. No main merge or live-app deployment.

The existing mobile onboarding choice now selects the corresponding scene: Catholic retains the booth; Protestant uses plain windows, a wooden table and Bible lectern without altar candles; Orthodox adds a stylized icon screen, central doors and hanging lamps without a Catholic booth. The existing side prayer stand remains available to reach community peer support; this is not sacramental confession. Exploring/skipping keeps the current general chapel. Changing profile preferences updates the room. Candle visibility stays independent of all room choices.

The full-screen, blurred-prompt experiment is included separately in `prototypes/church-rooms/`. It does not replace the mobile Home layout in this PR. Its introductory tradition choice is stored in browser localStorage; journal text is never saved or transmitted. Account destinations are preview placeholders.

Shareable design reference: https://grace-gather-church-preview.inanipratyaksh.chatgpt.site

Original geometric figures are design placeholders, not replicas of sacred icon art. Orthodox architecture reference: https://www.oca.org/orthodoxy/the-orthodox-faith/worship/the-church-building/icons

Reuses the existing walnut texture and original ambience audio. All rooms are simplified and require contributor visual review before merge; Orthodox icon artwork is intentionally not production-quality. The mobile integration preserves GL recovery and the existing onboarding/profile persistence, Scripture edition selection and privacy behavior.

Validation: typecheck, lint, regression tests and web export. Physical-device touch, audio and visual review remain pending. No database migrations.
