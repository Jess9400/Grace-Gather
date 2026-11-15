import { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Grace & Gather",
  slug: process.env.EXPO_PROJECT_SLUG || "away-church",
  owner: process.env.EXPO_PROJECT_OWNER || config.owner,
  plugins: [
    ...(config.plugins ?? []),
    "@react-native-community/datetimepicker",
  ],
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.APPLE_BUNDLE_ID || "com.awaychurch.preview",
  },
  android: {
    ...config.android,
    ...(process.env.ANDROID_PACKAGE_ID
      ? { package: process.env.ANDROID_PACKAGE_ID }
      : {}),
    ...(process.env.ANDROID_PREVIEW_BUILD === "true"
      ? { blockedPermissions: [...(config.android?.blockedPermissions ?? []), "android.permission.CAMERA"] }
      : {}),
  },
  extra: {
    ...config.extra,
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
});
