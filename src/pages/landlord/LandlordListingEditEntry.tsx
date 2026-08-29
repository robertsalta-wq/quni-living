import { Navigate, useLocation } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  isListingEditSectionPath,
  resolveListingEditDesktopRedirect,
} from '../../lib/listingEditDesktopRedirect'
import { isListingPreviewPath } from '../../lib/listingHubWizard'
import LandlordListingEditHubPage from './LandlordListingEditHubPage'
import LandlordListingPreviewPage from './LandlordListingPreviewPage'
import LandlordPropertyFormPage from './LandlordPropertyFormPage'

/**
 * Mobile (&lt; sm): listing health hub (+ section form drill-ins).
 * Desktop (≥ sm): long-form editor; nested hub routes redirect to base + #section-….
 * Preview stays on this route on both breakpoints (no hash redirect).
 */
export default function LandlordListingEditEntry() {
  const isMobile = useIsMobile()
  const location = useLocation()

  if (isListingPreviewPath(location.pathname)) {
    return <LandlordListingPreviewPage />
  }

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
