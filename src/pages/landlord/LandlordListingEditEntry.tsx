import { Navigate, useLocation } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  isListingEditSectionPath,
  resolveListingEditDesktopRedirect,
} from '../../lib/listingEditDesktopRedirect'
import LandlordListingEditHubPage from './LandlordListingEditHubPage'
import LandlordPropertyFormPage from './LandlordPropertyFormPage'

/**
 * Mobile (&lt; sm): listing health hub (+ section form drill-ins).
 * Desktop (≥ sm): long-form editor; nested hub routes redirect to base + #section-….
 */
export default function LandlordListingEditEntry() {
  const isMobile = useIsMobile()
  const location = useLocation()

  if (!isMobile) {
    const redirectTo = resolveListingEditDesktopRedirect(location.pathname)
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    return <LandlordPropertyFormPage />
  }

  if (isListingEditSectionPath(location.pathname)) {
    return <LandlordPropertyFormPage />
  }

  return <LandlordListingEditHubPage />
}
