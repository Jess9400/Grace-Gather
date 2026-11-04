# Grace & Gather design guidance

Use the user-approved palette for new app screens and requested visual updates:

| Role | Color |
| --- | --- |
| Main background | Warm ivory `#FFFCF3` |
| Cards | White `#FFFFFF` |
| Text and primary buttons | Deep espresso `#302C28` |
| Small decorative details | Antique gold `#B28A3E` |

Use espresso text on ivory and white surfaces, and white text on espresso
buttons. Small gold text uses a darker readable gold. Preserve readable contrast,
reduced-motion preferences, and large-text layouts.

For mobile screens, reuse `colors` and the surface-aware components exported by
`mobile/src/components/quiet-ui.tsx`. Use `Card` for reading surfaces so shared text and
controls receive the correct contrast. Avoid independent screen palettes.

The approved product direction is the native app. The retained web prototype is a design reference. Keep the scope of
each task bounded; this guidance does not request a redesign of the legacy web
prototype or changes to backend behavior.

## In-progress Confession room

The user has explicitly postponed restyling the Confession room while Jess
finishes it. Palette consistency work must leave its screens, components, and
styles unchanged until the user requests that update. Its legacy `ui.tsx`,
Recorder, AudioPlayback and service modules remain separate from quiet-ui and
the new QuietRecorder/QuietAudioPlayback components. This does not block Jess's
ongoing Confession feature development.

Preserve other contributors' work. Follow the more specific instructions in
`mobile/AGENTS.md` for mobile implementation and validation.
