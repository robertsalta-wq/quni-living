import './lib/sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { LegalEntityProvider } from './context/LegalEntityContext'
import { PlatformFeaturesProvider } from './context/PlatformFeaturesContext'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { registerNativeOAuthDeepLinkHandler } from './lib/nativeOAuthDeepLink'
import { applyNativeStatusBarInsetFallback } from './lib/nativeStatusBarInsetFallback'
import AppNavigationRegistrar from './components/AppNavigationRegistrar'
import './index.css'
import App from './App'

applyNativeStatusBarInsetFallback()
registerNativeOAuthDeepLinkHandler()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppNavigationRegistrar />
      <HelmetProvider>
        <AuthProvider>
          <LegalEntityProvider>
            <PlatformFeaturesProvider>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </PlatformFeaturesProvider>
          </LegalEntityProvider>
        </AuthProvider>
      </HelmetProvider>
    </BrowserRouter>
  </StrictMode>,
)
