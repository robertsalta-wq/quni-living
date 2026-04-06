import { Capacitor } from '@capacitor/core'
import { PushNotifications, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications'
import { isSupabaseConfigured, supabase } from './supabase'

let nativeListenersInitialized = false
let pendingNavigateRoute: string | null = null
let navigateHandler: ((route: string) => void) | null = null

function normalizeNotificationRoute(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Most senders include a path like `/student-dashboard?x=1`
  if (trimmed.startsWith('/')) return trimmed

  // If it's a custom deep link like `com.quni.living://student-dashboard`
  // URL parsing supports custom schemes.
  try {
    const url = new URL(trimmed)
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:'

    if (isHttp) {
      if (!url.pathname) return null
      return `${url.pathname}${url.search}`
    }

    const path = `/${url.host}${url.pathname}`.replace(/\/+$/, '')
    return path.length > 1 ? path : `/${url.host}`
  } catch {
    // Not a valid URL. Fall back to "path-like" strings.
  }

  // If it's already a route fragment like `student-dashboard?x=1`
  if (/^[a-zA-Z0-9/_-]/.test(trimmed)) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  return null
}

function extractRouteFromPushNotification(notification: unknown): string | null {
  // Capacitor gives the payload in `notification.data` (and we only care about our custom keys).
  const n = (notification && typeof notification === 'object' ? (notification as Record<string, unknown>) : null) ?? {}

  const dataCandidate = (n.data && typeof n.data === 'object' ? (n.data as Record<string, unknown>) : null) ?? null
  const payloadCandidate =
    (n.payload && typeof n.payload === 'object' ? (n.payload as Record<string, unknown>) : null) ?? null
  const payloadDataCandidate =
    (payloadCandidate?.data && typeof payloadCandidate.data === 'object'
      ? (payloadCandidate.data as Record<string, unknown>)
      : null) ?? null

  const data = dataCandidate ?? payloadDataCandidate

  const deepLink =
    (data?.['deep_link'] && typeof data['deep_link'] === 'string' ? data['deep_link'] : null) ??
    (data?.['deepLink'] && typeof data['deepLink'] === 'string' ? data['deepLink'] : null) ??
    (typeof n['deep_link'] === 'string' ? (n['deep_link'] as string) : null) ??
    (typeof n['deepLink'] === 'string' ? (n['deepLink'] as string) : null) ??
    (typeof n['link'] === 'string' ? (n['link'] as string) : null) ??
    null

  const route =
    (data?.['route'] && typeof data['route'] === 'string' ? data['route'] : null) ??
    (typeof n['route'] === 'string' ? (n['route'] as string) : null) ??
    null

  return normalizeNotificationRoute(deepLink ?? route)
}

export function registerNativePushNotificationListeners(onNavigate: (route: string) => void): void {
  navigateHandler = onNavigate

  if (!Capacitor.isNativePlatform()) return

  // Flush any pending navigation if the tap happened before the initializer mounted.
  if (pendingNavigateRoute) {
    const route = pendingNavigateRoute
    pendingNavigateRoute = null
    onNavigate(route)
  }

  if (nativeListenersInitialized) return
  nativeListenersInitialized = true

  void (async () => {
    // Foreground notifications: presentation is handled natively via `presentationOptions`.
    // This listener is included to satisfy our in-app handling requirements.
    await PushNotifications.addListener('pushNotificationReceived', (_notification: PushNotificationSchema) => {
      // no-op: native presentation handles the visible alert
      void _notification
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const route = extractRouteFromPushNotification(action?.notification ?? action)
      if (!route) return

      if (navigateHandler) navigateHandler(route)
      else pendingNavigateRoute = route
    })
  })()
}

export async function requestPermissionAndRegisterPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!isSupabaseConfigured) return

  const platform = Capacitor.getPlatform()
  if (platform !== 'ios' && platform !== 'android') return

  let permStatus = await PushNotifications.checkPermissions()
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions()
  }

  if (permStatus.receive !== 'granted') {
    return
  }

  let registrationHandle:
    | {
        remove: () => Promise<void>
      }
    | null = null
  let registrationErrorHandle:
    | {
        remove: () => Promise<void>
      }
    | null = null

  try {
    const token = await new Promise<string>((resolve, reject) => {
      void (async () => {
        try {
          registrationHandle = await PushNotifications.addListener('registration', (t) => resolve(t.value))
          registrationErrorHandle = await PushNotifications.addListener('registrationError', (err) =>
            reject(new Error(err.error ?? 'Push notification registration error')),
          )

          await PushNotifications.register()
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      })()
    })

    type DeviceTokensUpsertRow = {
      user_id: string
      token: string
      platform: 'ios' | 'android'
      updated_at: string
    }

    type DeviceTokensUpsertResult = { error: { message?: string } | null }

    const deviceTokensTable = (supabase as unknown as {
      from: (table: string) => {
        upsert: (
          values: DeviceTokensUpsertRow,
          options: { onConflict: string },
        ) => Promise<DeviceTokensUpsertResult>
      }
    }).from('device_tokens')

    const { error } = await deviceTokensTable.upsert(
      {
        user_id: userId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token,platform' },
    )

    if (error) {
      console.warn('[PushNotifications] device token upsert failed', error)
    }
  } finally {
    // These handles are assigned inside async listeners; TS may not be able to prove
    // they are non-null by the time we reach `finally`, so we cast to the expected shape.
    const rh = registrationHandle as { remove: () => Promise<void> } | null
    const reh = registrationErrorHandle as { remove: () => Promise<void> } | null
    void rh?.remove()
    void reh?.remove()
  }
}

