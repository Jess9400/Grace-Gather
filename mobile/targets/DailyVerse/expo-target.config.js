module.exports = (config) => ({
  type: "widget",
  name: "DailyVerse",
  displayName: "Grace & Gather",
  bundleIdentifier: ".DailyVerse",
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
