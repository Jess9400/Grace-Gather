import { ExpoConfig, ConfigContext } from "expo/config";
import { withInfoPlist, type ConfigPlugin } from "expo/config-plugins";

// The WebRTC library references camera APIs even though gatherings use audio
// only. Apple requires this purpose string for any binary referencing them.
const describeCameraUsage: ConfigPlugin = (config) =>
  withInfoPlist(config, (mod) => {
    mod.modResults.NSCameraUsageDescription =
      "Grace & Gather does not use the camera. Gatherings are audio only.";
    return mod;
  });
const appConfig = ({ config }: ConfigContext): ExpoConfig => ({
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
// Applied before the listed plugins are registered, so this clear description
// replaces the WebRTC plugin's generic text in the final Info.plist.
export default (context: ConfigContext): ExpoConfig =>
  describeCameraUsage(appConfig(context));
