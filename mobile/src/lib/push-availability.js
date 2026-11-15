// A preview without Firebase must not promise or request remote push alerts.
// Local reminders and in-app notifications are independent of this flag.
export function canUseRemotePush(platform, androidEnabled) {
  return platform !== "android" || androidEnabled !== "false";
}
