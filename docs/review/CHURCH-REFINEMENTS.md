# Church refinements for contributor review

This branch is a review candidate, not a production deployment. It builds on main through #27, which already contains the church scene, journal CTA, restored Discover navigation, one-at-a-time place tour, candle actions and original ambience.

## Implemented here

- Navigation order: Home, Discover, Bible Study, Confession (or the existing tradition-specific label), Gatherings. Journal remains accessible from Home and My Journal.
- Audio defaults on unless explicitly muted. Existing device preference is respected. Sound, lighting and tour controls sit inside the scene; no separate enable button. Retains the original loop, fade, silent-switch behavior and screen-focus stopping.
- The place tour is remembered after completion; Show places replays it. Accessible interactive objects and the no-WebGL fallback list remain.
- Church preferences let a person override the tradition's candle default. Explicit Protestant defaults off; Catholic/Orthodox defaults on; exploring preserves choice. This does not claim all members of a tradition practice alike.
- Candle suggestions after a journal entry only appear for sad/grateful paths and when welcomed. Existing support-guidance branches remain in place. The candle is still reachable from the church when enabled.
- One curated small step is initially shown, with See other options revealing alternatives.
- Church presence joins anonymously for everyone while Home is focused and the entrance has ended. The requested people wording appears for five seconds then fades. Technically this counts connected clients, not deduplicated people. No invented baseline of candles lit by others.
- New interface copy supplied in English, Portuguese, Spanish and Russian; native-speaker review remains useful.

## Review checklist

- First visit: sound on, respecting the native silent switch; mute works; leave Home during playback and confirm it stops.
- Complete tour, return/relaunch, confirm it does not automatically replay; Show places still works. Reduced-motion controls remain available.
- Protestant candle default off; turn on in Profile → Church preferences and confirm both Home and entry actions follow it. Other traditions can turn it off without changing the confessional or prayer corner.
- Presence joins only on Home; leaving Home/backgrounding removes the subscription.
- One step visible initially, other choices accessible, existing save/check-in behavior unchanged.
- No Confession room styling or submission behavior changed.

## Audio choice

The contributor already supplied `mobile/assets/church/ambience.m4a`. Its adjacent README describes an original synthesized choir-like loop with no third-party samples. Keep it as a review candidate; its musical character and actual phone playback still need listening review. No new audio asset was added here.

Recommended alternatives: a commissioned quiet room/rain loop without words or a subtle instrumental pad. Avoid sudden bells or prominent melody. Let people mute and keep the choice.

For externally sourced recordings, verify each file's commercial-app/redistribution rights and retain attribution and source evidence. Freesound has mixed licenses (https://freesound.org/help/faq/); CC0 is a useful filter, not a substitute for checking the selected recording. Pixabay restricts standalone redistribution (https://pixabay.com/service/license-summary/), so do not assume any downloadable track is suitable as an in-app audio library.

## Validation

Typecheck, lint, 23 mobile tests, and web export passed. Physical iPhone audio, touch interaction, VoiceOver and multilingual copy review remain release checks. No database changes or production deployment in this PR.
