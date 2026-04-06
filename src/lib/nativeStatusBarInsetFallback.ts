import { Capacitor } from '@capacitor/core'

/**
 * Capacitor Android (edge-to-edge / Android 15+) can paint the WebView under the status bar while both
 * `env(safe-area-inset-top)` and injected `--safe-area-inset-top` stay 0 until (or if) native insets sync.
 * A small minimum top inset avoids the fixed header (logo, auth CTAs) sitting under the system bar.
 * Web (including Chrome on Android) relies on `env()` / viewport; fallback stays 0px there.
 */
export function applyNativeStatusBarInsetFallback(): void {
  if (typeof document === 'undefined') return
  if (!Capacitor.isNativePlatform()) return
  if (Capacitor.getPlatform() !== 'android') return
  document.documentElement.style.setProperty('--quni-status-bar-fallback', '48px')
}
