import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

export default function NativePushNotificationsInitializer(): null {
  const { user, loading, role } = useAuthContext()
  const navigate = useNavigate()
  const requestedForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('../lib/nativePushNotifications').then((m) => {
      if (cancelled) return
      m.registerNativePushNotificationListeners((route) => {
        navigate(route)
      })
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    if (!user) {
      requestedForUserIdRef.current = null
      void import('../lib/nativePushNotifications')
        .then((m) => m.unsubscribeAdminAlertsFcmTopic())
        .catch(() => {
          /* best-effort on sign-out */
        })
      return
    }

    if (loading) return

    if (requestedForUserIdRef.current === user.id) return
    requestedForUserIdRef.current = user.id

    const isAdmin = role === 'admin'
    void import('../lib/nativePushNotifications')
      .then((m) => m.requestPermissionAndRegisterPushToken(user.id, { isAdmin }))
      .catch((err) => {
        console.warn('[PushNotifications] permission/register failed', err)
      })
  }, [user, loading, role])

  return null
}
