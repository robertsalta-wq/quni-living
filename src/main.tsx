import { clearChunkReloadSessionFlag, registerStaleChunkLoadRecovery } from './lib/chunkLoadRecovery'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import BootErrorBoundary from './components/BootErrorBoundary'
import { AppTree } from './AppTree'
import { applyNativeStatusBarInsetFallback } from './lib/nativeStatusBarInsetFallback'
import { prefetchRouteChunks, warmRouteChunkForHydration } from './lib/routePrefetch'
import './index.css'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

applyNativeStatusBarInsetFallback()
prefetchRouteChunks(window.location.pathname)
clearChunkReloadSessionFlag()
registerStaleChunkLoadRecovery()
// Capacitor-only; keep supabase client off the marketing web critical path.
void import('./lib/nativeOAuthDeepLink').then((m) => m.registerNativeOAuthDeepLinkHandler())

function scheduleSentryInit(): void {
  const boot = () => {
    void import('./lib/sentry')
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(boot, { timeout: 4000 })
  } else {
    window.setTimeout(boot, 2000)
  }
}

const rootEl = document.getElementById('root')!

const app = (
  <StrictMode>
    <BootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <AppTree />
          <Analytics />
        </BrowserRouter>
      </HelmetProvider>
    </BootErrorBoundary>
  </StrictMode>
)

async function mount(): Promise<void> {
  // Prerendered SEO/marketing pages: load their chunk before hydrate so lazy routes
  // do not flash the Suspense fallback over already-painted HTML.
  await warmRouteChunkForHydration(window.location.pathname)

  if (rootEl.hasChildNodes()) {
    hydrateRoot(rootEl, app)
  } else {
    createRoot(rootEl).render(app)
  }
  scheduleSentryInit()
}

void mount()
