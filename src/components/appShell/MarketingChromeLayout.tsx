import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import FocusFormLegalStrip from '../FocusFormLegalStrip'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import PageRouteFallback from '../PageRouteFallback'
import { isFocusFormFlowPath, isLandlordInviteMinimalChromePath } from '../../lib/site'

/** Public / marketing chrome (Header + Footer). App shell routes do not use this. */
export default function MarketingChromeLayout() {
  const location = useLocation()
  const hideFooterForFormFlow = isFocusFormFlowPath(location.pathname)
  // Invite landings use an in-flow (relative) header — no fixed-offset padding.
  const inviteInFlowHeader = isLandlordInviteMinimalChromePath(location.pathname)

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Header />
      <main
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${
          inviteInFlowHeader ? '' : 'max-md:pt-main-below-fixed-header md:pt-0'
        }`}
      >
        <OnboardingResumeBanner />
        <Suspense fallback={<PageRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideFooterForFormFlow ? <Footer /> : <FocusFormLegalStrip />}
    </div>
  )
}
