import { Capacitor } from '@capacitor/core'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { registerNativePushNotificationListeners, requestPermissionAndRegisterPushToken } from '../lib/nativePushNotifications'

export default function NativePushNotificationsInitializer(): null {
  const { user, loading } = useAuthContext()
  const navigate = useNavigate()
  const requestedForUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    registerNativePushNotificationListeners((route) => {
      navigate(route)
    })
  }, [navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    if (!user) {
      requestedForUserIdRef.current = null
      return
    }

    if (loading) return

    if (requestedForUserIdRef.current === user.id) return
    requestedForUserIdRef.current = user.id

    void requestPermissionAndRegisterPushToken(user.id).catch((err) => {
      console.warn('[PushNotifications] permission/register failed', err)
    })
  }, [user, loading])

  return null
}

