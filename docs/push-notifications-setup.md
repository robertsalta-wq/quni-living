# Push notifications setup (Firebase + Capacitor)

A **Firebase project** is required for both iOS and Android when using FCM-backed flows with Capacitor. Native push on iOS still relies on **Apple Push Notification service (APNs)**; Firebase acts as the bridge many teams use to send to both platforms from one place.

Official Capacitor API reference: [Push Notifications](https://capacitorjs.com/docs/apis/push-notifications).

## Firebase (both platforms)

1. Create or select a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add an **iOS** app and an **Android** app with the same bundle / application IDs you use in Xcode and `android/app/build.gradle` (must match your Capacitor `appId`).

## iOS — APNs and Xcode

### What you need from Apple

- An **APNs authentication key** (recommended: `.p8` key from Apple Developer → Certificates, Identifiers & Profiles → Keys → Apple Push Notifications service), **or**
- APNs **certificates** (legacy; key-based auth is simpler to rotate).

Your iOS app’s **Push Notifications** capability must be enabled for the target’s bundle ID.

### Where it goes in Xcode

- Open the native project (`ios/App/App.xcworkspace` after Capacitor sync).
- Select the app target → **Signing & Capabilities** → add **Push Notifications** (and **Background Modes** → *Remote notifications* if your flow requires background delivery).
- Ensure **Team**, **Bundle Identifier**, and provisioning profiles allow push for that bundle ID.

### Where it goes in Firebase

- Firebase Console → **Project settings** (gear) → **Cloud Messaging**.
- Under **Apple app configuration**, upload the **APNs authentication key** (`.p8`) or the **APNs certificates**, as prompted. This lets FCM deliver to your iOS app via APNs.

## Android — `google-services.json`

1. In Firebase Console, open the **Android** app you registered.
2. Download **`google-services.json`**.
3. Place it at:

   `android/app/google-services.json`

   (Path is relative to the repo root; the `android/` folder is created by `npx cap add android` / Capacitor sync.)

4. Follow Firebase’s Android setup (Gradle plugin / dependencies) if not already wired in the Capacitor Android template you use; align with current [Capacitor Android docs](https://capacitorjs.com/docs/android) and Firebase’s latest Gradle instructions.

## FCM topic `admin-alerts` (platform admins)

The app installs `@capacitor-firebase/messaging` and, **after** a native push token is registered, subscribes **platform admin** accounts (`src/lib/adminEmails.ts` / `is_platform_admin`) to the FCM topic **`admin-alerts`** (see `src/lib/nativePushNotifications.ts`). Run **`npx cap sync`** after `npm install` so iOS/Android pick up the plugin. Follow [Capawesome Firebase setup](https://github.com/capawesome-team/capacitor-firebase/blob/main/docs/firebase-setup.md) alongside your existing `google-services.json` / `GoogleService-Info.plist`.

## Further reading

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
