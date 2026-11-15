# Grace & Gather: private Android preview

This is a private APK for a small test, not a Google Play release. Wait for the approved logo and merge the build profile before starting a build. Do not turn on paid Expo services or submit the app to Google Play as part of this test.

## Prepared

- The `android-preview` profile makes an installable APK and uses the existing Grace & Gather Expo project's `preview` environment. Its test app identity is `com.graceandgather.preview`; it is not a decision about the permanent Google Play identifier.
- The preview environment contains the account-service URL and publishable key. The preflight rejects a preview build if these or the Expo project ID and Android identity are missing. Never place a service-role key, private signing key or other secret in public app variables.
- Expo generated a signing keystore for this preview in the existing project. Preserve that keystore for updates to this preview; do not print, commit or casually share its contents.
- Apple sign-in is disabled for this Android preview. Test sign-in with email.
- Remote Android phone alerts are intentionally disabled for this preview until Firebase is configured. Onboarding will not ask for those alerts; the notification settings explain the limitation. In-app notifications and local reminders remain separate and must be tested.
- The audio-only preview blocks the automatically added camera permission. Verify microphone and audio access in the actual build.

## Build when ready

1. Confirm the latest approved app changes and Android preview profile are merged, the logo assets are present, Expo's free build allowance is available, and the `preview` environment still targets the intended backend.
2. From `mobile`, use the existing Expo account and project. For tools that resolve project configuration before loading the profile, supply the non-secret identity values explicitly:

   ```sh
   ANDROID_PREVIEW_BUILD=true ANDROID_PACKAGE_ID=com.graceandgather.preview EXPO_PROJECT_SLUG=graceandgather EXPO_PROJECT_OWNER=jess1994s-team EXPO_PUBLIC_EAS_PROJECT_ID=84bb1fb4-945a-4071-b317-83f2bdd56382 npx eas-cli build --platform android --profile android-preview
   ```

3. Confirm the build succeeds and produces an APK. The install link may be usable by anyone who has it, so share it privately and check the current Expo distribution settings. Android may require the tester to allow installation from that source; developer verification rules vary by region and device.
4. This preview connects to the existing app backend, not an isolated database. Use a test account and non-sensitive test entries; do not treat it as a disposable offline demo.

## Test on a physical Android phone

- Install and open the APK. Test email sign-in, onboarding, the chosen language and Bible edition, closing and reopening, and signing out.
- Check the church, navigation, journal saving and account sync, previews and progress indicators, Discover, Unburden, gatherings, microphone permission and audio playback.
- Check in-app notifications. Do not mark phone push alerts as passed: they are disabled until the Android Firebase setup exists.
- Note device model, Android version, build number, screen recordings and failures. Do not include private writing, passwords or sign-in codes in reports.

## Later: Android push alerts

The user chose to defer these. Before enabling them, configure an appropriate Firebase project, Android app registration and Expo FCM credentials, then replace the preview's `EXPO_PUBLIC_ANDROID_REMOTE_PUSH_ENABLED=false` setting and test on a real device. Firebase private service-account credentials must never be committed or bundled in the app. See [Expo's FCM setup](https://docs.expo.dev/push-notifications/fcm-credentials/).
