# Grace & Gather design guidance

Use the user-approved palette for new app screens and requested visual updates:

| Role | Color |
| --- | --- |
| Main background | Dark green `#0D3028` |
| Primary buttons and selected icons | Soft moss `#B7C68F` |
| Reading cards | Creamy white `#FFFDF9` |
| Small decorative details | Champagne gold `#D7BD84` |

Use cream text on dark backgrounds and dark green text on cream cards or moss
buttons. Preserve readable contrast for supporting text, inputs, and selections.

For mobile screens, reuse `colors` and the surface-aware components exported by
`mobile/src/components/ui.tsx`. Use `Card` for reading surfaces so shared text and
controls receive the correct contrast. Avoid independent screen palettes.

The same approved brand colors apply to future web UI work. Keep the scope of
each task bounded; this guidance does not request a redesign of the legacy web
prototype or changes to backend behavior.

## In-progress Confession room

The user has explicitly postponed restyling the Confession room while Jess
finishes it. Palette consistency work must leave its screens, components, and
styles unchanged until the user requests that update. This does not block Jess's
ongoing Confession feature development.

Preserve other contributors' work. Follow the more specific instructions in
`mobile/AGENTS.md` for mobile implementation and validation.
