import { ExpoConfig, ConfigContext } from "expo/config";
import { withInfoPlist, type ConfigPlugin } from "expo/config-plugins";

// The WebRTC plugin always writes a generic camera message, even with
// cameraPermission: false. Gatherings are voice only and the app never asks
// for the camera, so the key is removed rather than left with vague wording.
const withoutCameraUsage: ConfigPlugin = (config) =>
  withInfoPlist(config, (mod) => {
    delete mod.modResults.NSCameraUsageDescription;
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
// Applied before the listed plugins are registered, so its Info.plist change
// runs after theirs and the WebRTC camera key is gone from the final file.
export default (context: ConfigContext): ExpoConfig =>
  withoutCameraUsage(appConfig(context));
