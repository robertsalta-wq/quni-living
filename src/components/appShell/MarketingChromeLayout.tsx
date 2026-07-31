import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import FocusFormLegalStrip from '../FocusFormLegalStrip'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import PageRouteFallback from '../PageRouteFallback'
import {
  isFocusFormFlowPath,
  isLandlordInviteMinimalChromePath,
  isLandlordInvitePapersFooterPath,
} from '../../lib/site'

/** Public / marketing chrome (Header + Footer). App shell routes do not use this. */
export default function MarketingChromeLayout() {
  const location = useLocation()
  const hideFooterForFormFlow = isFocusFormFlowPath(location.pathname)
  const papersFooterPage = isLandlordInvitePapersFooterPath(location.pathname)
  const inviteInFlowHeader = isLandlordInviteMinimalChromePath(location.pathname)
  /** Desk invite opens with its own letterhead: no marketing masthead. */
  const hideMarketingHeader = papersFooterPage

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {!hideMarketingHeader ? <Header /> : null}
      <main
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col ${
          hideMarketingHeader || inviteInFlowHeader ? '' : 'max-md:pt-main-below-fixed-header md:pt-0'
        }`}
      >
        <OnboardingResumeBanner />
        <Suspense fallback={<PageRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideFooterForFormFlow ? <Footer /> : papersFooterPage ? null : <FocusFormLegalStrip />}
    </div>
  )
}
