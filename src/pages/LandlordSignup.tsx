import { useEffect, useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { INTENDED_LANDLORD_SERVICE_TIER_KEY, parseLandlordServiceTier } from '../lib/landlordServiceTier'

/** Legacy URL — same Google-first signup as /signup (role chosen after sign-in on onboarding). */
export default function LandlordSignup() {
  const location = useLocation()
  const tier = useMemo(
    () => parseLandlordServiceTier(new URLSearchParams(location.search).get('tier')),
    [location.search],
  )

  useEffect(() => {
    if (!tier) return
    try {
      localStorage.setItem(INTENDED_LANDLORD_SERVICE_TIER_KEY, tier)
    } catch {
      /* ignore storage failures */
    }
  }, [tier])

  return <Navigate to="/signup" replace />
}
