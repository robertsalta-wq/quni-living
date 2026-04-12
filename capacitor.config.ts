/// <reference types="@capacitor/push-notifications" />
/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig & { bundledWebRuntime: boolean } = {
  appId: 'com.quni.living',
  appName: 'Quni Living',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    // Align with --brand-header-bg so any edge-to-edge gutter matches the nav strip; Capacitor still injects
    // --safe-area-inset-* for insets (see Android SystemBars + viewport-fit=cover in index.html).
    backgroundColor: '#fef9e4',
  },
  plugins: {
    PushNotifications: {
      // Ensure iOS/Android foreground notifications display while the app is open.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
