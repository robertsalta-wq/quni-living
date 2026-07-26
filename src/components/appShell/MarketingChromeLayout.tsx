import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import FocusFormLegalStrip from '../FocusFormLegalStrip'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import PageRouteFallback from '../PageRouteFallback'
import AskQuniMobileDock from '../aiChat/AskQuniMobileDock'
import { isDeskShellEnabled } from '../../lib/deskShell'
import { isFocusFormFlowPath } from '../../lib/site'

/** Public / marketing chrome (Header + Footer). App shell routes do not use this. */
export default function MarketingChromeLayout() {
  const location = useLocation()
  const hideFooterForFormFlow = isFocusFormFlowPath(location.pathname)
  const deskHome =
    isDeskShellEnabled() && (location.pathname === '/' || location.pathname === '')
  /** Desk home keeps Header; PapersBlock replaces mega-footer. */
  const hideFooter = hideFooterForFormFlow || deskHome
  const showAskQuniDock = isDeskShellEnabled() && !hideFooterForFormFlow

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Header />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col max-md:pt-main-below-fixed-header md:pt-0">
        <OnboardingResumeBanner />
        <Suspense fallback={<PageRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideFooter ? <Footer /> : hideFooterForFormFlow ? <FocusFormLegalStrip /> : null}
      {showAskQuniDock ? <AskQuniMobileDock /> : null}
    </div>
  )
}
