import { Navigate, useLocation } from 'react-router-dom'
import { INTENDED_LANDLORD_SERVICE_TIER_KEY, parseLandlordServiceTier } from '../lib/landlordServiceTier'

/** Legacy URL — same Google-first signup as /signup (role chosen after sign-in on onboarding). */
export default function LandlordSignup() {
  const location = useLocation()
  const tier = parseLandlordServiceTier(new URLSearchParams(location.search).get('tier'))
  if (tier) {
    try {
      localStorage.setItem(INTENDED_LANDLORD_SERVICE_TIER_KEY, tier)
    } catch {
      /* ignore storage failures */
    }
  }
  return <Navigate to="/signup" replace />
}
