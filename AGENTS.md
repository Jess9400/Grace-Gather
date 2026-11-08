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

## Church Home decisions (product owner, 8 November 2026)

These decisions govern the church Home (the doors, the 3D church and their
controls). Follow them in new work and when revising open pull requests;
change them only when the product owner asks.

1. **Sound is on by default.** The ambience starts softly after the doors.
   It stays silent when the phone is on silent (keep `playsInSilentMode:
   false`). If the person turns sound off, remember that choice on the device
   and keep it off until they turn it on again. Do not add a separate
   "Enable church sounds" button.
2. **Controls stay on Home, quietly.** Sound on/off, day/night and "show me
   around" remain on Home, integrated into the church scene so they read as
   part of its decoration (for example small, translucent, low-contrast icons
   inside a corner of the church image), visible but not competing with it.
   Keep them at least 44 pt and labelled for screen readers. A preferences
   screen may mirror these controls, but Settings must never be the only
   place to change them: people rarely open settings.
3. **The place tour runs once.** Show it the first time someone enters,
   remember that it was seen, and let them replay it from the quiet control
   on Home.
4. **The presence line is for everyone, briefly.** No opt-in. After entering,
   show "There are N people in church right now" (two or more) or "You're the
   first one here right now" (one) for a few seconds (about 5), then fade it
   out. Counting stays anonymous: a random key per visit, no account, name or
   journal data. Hide it when the count is unavailable.
5. **A personal candle choice controls candles only.** It may switch the
   candle stand and candle suggestions on or off, but must not change the
   confessional, the Protestant prayer corner or the Confession/Unburden
   label, which follow the person's tradition.
