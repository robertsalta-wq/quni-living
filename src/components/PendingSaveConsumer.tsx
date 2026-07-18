import { useEffect, useRef } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { useSavedProperties } from '../context/SavedPropertiesContext'
import { isRenterRole } from '../lib/authProfile'
import { consumePendingSaveProperty, peekPendingSavePropertyId } from '../lib/savedProperties'

/**
 * Central authenticated-session consumer for guest “save then sign in”.
 * Runs on any authenticated load — not tied to PropertyDetail (card saves on /listings
 * never visit detail).
 */
export function PendingSaveConsumer() {
  const { user, role, loading } = useAuthContext()
  const { markSavedLocal } = useSavedProperties()
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (loading || !user || !isRenterRole(role)) return
    if (!peekPendingSavePropertyId()) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    void (async () => {
      const id = peekPendingSavePropertyId()
      const ok = await consumePendingSaveProperty()
      if (ok && id) markSavedLocal(id)
      inFlightRef.current = false
    })()
  }, [user?.id, role, loading, markSavedLocal])

  return null
}
