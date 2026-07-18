import { AuthProvider } from './context/AuthContext'
import { SavedPropertiesProvider } from './context/SavedPropertiesContext'
import { PostAuthOnboardingRedirect } from './components/PostAuthOnboardingRedirect'
import { PendingSaveConsumer } from './components/PendingSaveConsumer'
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
        <PostAuthOnboardingRedirect />
        <SavedPropertiesProvider>
          <PendingSaveConsumer />
          <LegalEntityProvider>
            <PlatformFeaturesProvider>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </PlatformFeaturesProvider>
          </LegalEntityProvider>
        </SavedPropertiesProvider>
      </AuthProvider>
    </>
  )
}
