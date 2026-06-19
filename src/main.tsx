import './lib/sentry'
import { clearChunkReloadSessionFlag, registerStaleChunkLoadRecovery } from './lib/chunkLoadRecovery'
import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppTree } from './AppTree'
import { registerNativeOAuthDeepLinkHandler } from './lib/nativeOAuthDeepLink'
import { applyNativeStatusBarInsetFallback } from './lib/nativeStatusBarInsetFallback'
import { prefetchRouteChunks } from './lib/routePrefetch'
import './index.css'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

applyNativeStatusBarInsetFallback()
prefetchRouteChunks(window.location.pathname)
registerNativeOAuthDeepLinkHandler()
clearChunkReloadSessionFlag()
registerStaleChunkLoadRecovery()

const rootEl = document.getElementById('root')!

const app = (
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-6 text-center text-gray-900">
          <p className="text-base font-medium">Something went wrong. Our team has been notified.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      }
    >
      <HelmetProvider>
        <BrowserRouter>
          <AppTree />
        </BrowserRouter>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}
