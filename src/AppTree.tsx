import { AuthProvider } from './context/AuthContext'
import { PostAuthOnboardingGuard } from './components/PostAuthOnboardingGuard'
import { LegalEntityProvider } from './context/LegalEntityContext'
import { PlatformFeaturesProvider } from './context/PlatformFeaturesContext'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import AppNavigationRegistrar from './components/AppNavigationRegistrar'
import App from './App'

/** Shared provider + app shell used by the client entry and guide prerender. Router wraps this from outside. */
export function AppTree() {
  return (
    <>
      <AppNavigationRegistrar />
      <AuthProvider>
        <PostAuthOnboardingGuard>
        <LegalEntityProvider>
          <PlatformFeaturesProvider>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </PlatformFeaturesProvider>
        </LegalEntityProvider>
        </PostAuthOnboardingGuard>
      </AuthProvider>
    </>
  )
}
