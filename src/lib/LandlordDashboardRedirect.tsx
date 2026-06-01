import { Navigate, useLocation } from 'react-router-dom'

/** Preserve hash when redirecting legacy /landlord-dashboard URLs. */
export default function LandlordDashboardRedirect() {
  const { hash } = useLocation()
  return <Navigate to={`/landlord/dashboard${hash}`} replace />
}
