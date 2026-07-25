import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import FocusFormLegalStrip from '../FocusFormLegalStrip'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import PageRouteFallback from '../PageRouteFallback'
import { isDeskShellEnabled, isDeskShellExperimentPath } from '../../lib/deskShell'
import { isFocusFormFlowPath } from '../../lib/site'

/**
 * Chrome for desk-shell experiment routes (currently `/pricing`).
 *
 * When desk_shell_enabled is OFF: mirrors MarketingChromeLayout (Header + Footer)
 * so existing marketing pages stay byte-identical — this file is a new layout,
 * not an edit to MarketingChromeLayout / Footer / Header.
 *
 * When ON: no Header/Footer (menu-less shell). Pages own their noindex meta.
 */
export default function ExperimentChromeLayout() {
  const location = useLocation()
  const shellOn = isDeskShellEnabled() && isDeskShellExperimentPath(location.pathname)
  const hideFooterForFormFlow = isFocusFormFlowPath(location.pathname)

  if (shellOn) {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <Suspense fallback={<PageRouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Header />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col max-md:pt-main-below-fixed-header md:pt-0">
        <OnboardingResumeBanner />
        <Suspense fallback={<PageRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!hideFooterForFormFlow ? <Footer /> : <FocusFormLegalStrip />}
    </div>
  )
}
