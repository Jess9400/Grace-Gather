# Grace & Gather design guidance

The user approved **Candlelight** as the app's only look (November 2026). Use it
for new app screens and requested visual updates:

| Role | Color |
| --- | --- |
| Room background | Dark espresso `#1B1612`, with a warm candle glow from the top |
| Cards and fields | Deep brown `#2A221B` |
| Text | Ivory `#F4EBDA` (secondary text `#B7A993`) |
| Primary buttons and selected items | Cream `#F1E4CB` with dark espresso text |
| Small decorative details | Antique gold `#C9A45C` (small gold text `#D9B974`) |
| Tab bar | Darker espresso `#120E0B` |

A journal letter (the writing page and a saved entry) stays a cream page
`#F8F0DE` with espresso ink `#302C28`, so it reads as the person's own writing.
Preserve readable contrast, reduced-motion preferences, and large-text layouts.

For mobile screens, reuse `colors`, `letter`, `switchColors`, `Backdrop` and the
surface-aware components exported by `mobile/src/components/quiet-ui.tsx`. Use `Card` for reading surfaces so shared text and
controls receive the correct contrast. Avoid independent screen palettes.

The approved product direction is the native app. The retained web prototype is a design reference. Keep the scope of
each task bounded; this guidance does not request a redesign of the legacy web
prototype or changes to backend behavior.

## Confession room

The user asked for the Confession room to take Candlelight with the rest of the
app (November 2026): `confession-theme.ts` and the legacy `ui.tsx` palette now
use the Candlelight colours. Its legacy `ui.tsx`, Recorder, AudioPlayback and
service modules otherwise remain separate from quiet-ui and the new
QuietRecorder/QuietAudioPlayback components, and Jess continues the Confession
feature work; keep further visual changes there to what the user requests.

Preserve other contributors' work. Follow the more specific instructions in
`mobile/AGENTS.md` for mobile implementation and validation.
