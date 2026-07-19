import { Navigate, useLocation } from 'react-router-dom'

/** Preserve search + hash when redirecting legacy `/landlord-dashboard` URLs. */
export default function LandlordDashboardRedirect() {
  const { hash, search } = useLocation()
  return <Navigate to={`/landlord/dashboard${search}${hash}`} replace />
}
