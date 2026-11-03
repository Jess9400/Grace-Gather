import { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Grace & Gather",
  slug: "away-church",
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.APPLE_BUNDLE_ID || "com.awaychurch.preview",
  },
  extra: {
    ...config.extra,
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
});
