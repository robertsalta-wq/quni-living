import { Navigate, useLocation } from 'react-router-dom'
import {
  landlordDashboardProfilePath,
  landlordDashboardProfilePathFromHash,
} from './landlordDashboardProfilePaths'

/** Legacy /landlord-profile and /landlord/profile → dashboard Profile tab. */
export default function LandlordProfileRedirect() {
  const { hash } = useLocation()
  const to = landlordDashboardProfilePathFromHash(hash) ?? landlordDashboardProfilePath()
  return <Navigate to={to} replace />
}
