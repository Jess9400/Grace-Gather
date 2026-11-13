import type { IntroWalkProps } from "../lib/intro-walk";

// The intro walk is a preview drawn for the web only (IntroWalk.web.tsx).
// The phone app has no drawing of it yet, so this shows nothing there and the
// /intro page sends people back to the church.
export default function IntroWalk(_props: IntroWalkProps) {
  return null;
}
