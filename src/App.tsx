import { Suspense, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import NativePushNotificationsInitializer from './components/NativePushNotificationsInitializer'
import SeoPrivateRoutes from './components/SeoPrivateRoutes'
import PageRouteFallback from './components/PageRouteFallback'
import { ProtectedRoute, RequireUser } from './components/ProtectedRoute'
import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetail from './pages/PropertyDetail'
import Login from './pages/Login'
import AIChatWidget from './components/aiChat/AIChatWidget'
import { BookingFlowChromeProvider } from './context/BookingFlowChromeContext'
import { isFocusFormFlowPath } from './lib/site'
import LandlordDashboardRedirect from './lib/LandlordDashboardRedirect'
import GuideArticlePage from './pages/guides/GuideArticlePage'
import Guides from './pages/Guides'
import ForUniversities from './pages/ForUniversities'
import * as Lazy from './lazyPages'
import { prefetchRouteChunks } from './lib/routePrefetch'

function AdminPropertyFeesDeepLinkRedirect() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const q = encodeURIComponent(propertyId ?? '')
  return <Navigate to={`/admin/properties?fees=${q}`} replace />
}

function App() {
  const location = useLocation()

  useLayoutEffect(() => {
    prefetchRouteChunks(location.pathname)
  }, [location.pathname])

  const adminShell = location.pathname.startsWith('/admin')
  const aiLandingShell = location.pathname === '/landlords/ai'
  const showPublicChrome = !adminShell && !aiLandingShell
  const hideFooterForFormFlow = isFocusFormFlowPath(location.pathname)

  return (
      <BookingFlowChromeProvider>
        <>
        <ScrollToTop />
        <NativePushNotificationsInitializer />
        <SeoPrivateRoutes />
        {showPublicChrome && <Header />}
        <main
          className={
            showPublicChrome
              ? 'flex min-h-0 w-full min-w-0 flex-1 flex-col max-md:pt-main-below-fixed-header md:pt-0'
              : 'flex min-h-0 w-full min-w-0 flex-1 flex-col'
          }
        >
          <Routes>
          {/* Eager prerender routes sit outside Suspense so SSR HTML matches client hydration. */}
          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/:slug" element={<GuideArticlePage />} />
          <Route path="/for-universities" element={<ForUniversities />} />
          <Route
            element={
              <Suspense fallback={<PageRouteFallback />}>
                <Outlet />
              </Suspense>
            }
          >
          {/* Public - eager: home, listings funnel, login */}
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:slug" element={<PropertyDetail />} />
          <Route path="/search" element={<Navigate to="/listings" replace />} />
          <Route path="/properties" element={<Navigate to="/listings" replace />} />
          <Route path="/properties/:slug" element={<PropertyDetail />} />
          <Route path="/rent-near-campus" element={<Lazy.RentNearCampus />} />
          <Route path="/international" element={<Lazy.InternationalStudents />} />
          <Route path="/student-accommodation" element={<Lazy.StudentAccommodationIndex />} />
          <Route path="/student-accommodation/:universitySlug" element={<Lazy.UniversityAccommodation />} />
          <Route
            path="/student-accommodation/:universitySlug/:campusSlug"
            element={<Lazy.CampusAccommodation />}
          />
          <Route path="/terms" element={<Lazy.Terms />} />
          <Route path="/privacy" element={<Lazy.Privacy />} />
          <Route path="/non-discrimination" element={<Lazy.NonDiscrimination />} />
          <Route path="/landlord-service-agreement" element={<Lazy.LandlordServiceAgreement />} />
          <Route path="/about" element={<Lazy.About />} />
          <Route path="/how-it-works" element={<Lazy.HowItWorks />} />
          <Route path="/refunds" element={<Lazy.Refunds />} />
          <Route path="/pricing" element={<Lazy.Pricing />} />
          <Route path="/contact" element={<Lazy.Contact />} />
          <Route path="/faq" element={<Lazy.Faq />} />
          <Route path="/verification" element={<Lazy.Verification />} />
          <Route path="/services" element={<Lazy.Services />} />
          <Route path="/services/student-accommodation" element={<Lazy.ServiceStudentAccommodation />} />
          <Route path="/services/property-management" element={<Lazy.ServicePropertyManagement />} />
          <Route path="/services/landlord-partnerships" element={<Lazy.ServiceLandlordPartnerships />} />
          <Route path="/services/fully-furnished" element={<Lazy.ServiceFullyFurnished />} />
          <Route path="/for-landlords" element={<Navigate to="/services/landlord-partnerships" replace />} />
          <Route path="/landlords/ai" element={<Lazy.LandlordAIFeaturePage />} />
          <Route path="/landlord/onboarding" element={<Navigate to="/onboarding/landlord" replace />} />

          {/* Auth */}
          <Route path="/auth/callback" element={<Lazy.AuthCallback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<Lazy.ForgotPassword />} />
          <Route path="/reset-password" element={<Lazy.ResetPassword />} />
          <Route path="/verify-email" element={<Lazy.VerifyEmail />} />
          <Route path="/signup" element={<Lazy.Signup />} />
          <Route path="/invite/:token" element={<Lazy.InviteTenantPage />} />
          <Route path="/student-signup" element={<Lazy.StudentSignup />} />
          <Route path="/landlord-signup" element={<Lazy.LandlordSignup />} />

          <Route
            path="/messages"
            element={
              <RequireUser>
                <Lazy.MessagesInboxPage />
              </RequireUser>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <RequireUser>
                <Lazy.ConversationThreadPage />
              </RequireUser>
            }
          />
          <Route
            path="/onboarding"
            element={
              <RequireUser>
                <Lazy.Onboarding />
              </RequireUser>
            }
          />
          <Route
            path="/onboarding/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Lazy.StudentOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/landlord"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <Lazy.LandlordOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected (session + profile + metadata role) */}
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Lazy.StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Lazy.StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Lazy.StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/landlord-dashboard" element={<LandlordDashboardRedirect />} />
          <Route
            path="/landlord/dashboard"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <Lazy.LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/bookings/:bookingId/review"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <Lazy.LandlordBookingReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord-profile"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <Lazy.LandlordProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/profile"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <Lazy.LandlordProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/property/new"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                <Lazy.LandlordPropertyFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/property/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                <Lazy.LandlordPropertyFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/:propertyId"
            element={
              <ProtectedRoute
                allowedRoles={['student']}
                redirectUnauthenticatedToStudentSignup
                requireStudentListingActions
              >
                <Lazy.Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sample-agreements"
            element={
              <ProtectedRoute allowedRoles={['student', 'landlord', 'admin']}>
                <Lazy.SampleAgreementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Lazy.AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Lazy.LivingConsole />} />
            <Route path="_kitchen" element={<Lazy.AdminKitchen />} />
            <Route path="bookings" element={<Lazy.BookingsPage />} />
            <Route path="service-tier-events" element={<Lazy.AdminServiceTierEvents />} />
            <Route path="enquiries" element={<Lazy.AdminEnquiries />} />
            <Route path="landlord-leads" element={<Lazy.AdminLandlordLeads />} />
            <Route path="properties" element={<Lazy.AdminProperties />} />
            <Route path="properties/:propertyId/fees" element={<AdminPropertyFeesDeepLinkRedirect />} />
            <Route path="students" element={<Lazy.AdminStudents />} />
            <Route path="landlords" element={<Lazy.AdminLandlords />} />
            <Route path="apps" element={<Lazy.AdminApps />} />
            <Route path="payments" element={<Lazy.AdminPayments />} />
            <Route path="settings" element={<Lazy.AdminSettings />} />
            <Route path="team" element={<Lazy.AdminTeam />} />
            <Route path="pricing" element={<Lazy.PricingPage />} />
            <Route path="knowledge-base" element={<Lazy.KnowledgeBase />} />
            <Route path="documents" element={<Lazy.DocumentsPage />} />
            <Route path="agreement-previews" element={<Lazy.AgreementPreviewsPage />} />
            <Route path="domains" element={<Lazy.DomainsPage />} />
            <Route path="trust-checklist" element={<Lazy.TrustChecklist />} />
            <Route path="state-workflows" element={<Lazy.AdminStateWorkflows />} />
            <Route path="qase" element={<Lazy.QaseTicketList />} />
            <Route path="qase/settings" element={<Lazy.QaseSettings />} />
            <Route path="qase/:ticketId" element={<Lazy.QaseTicketDetail />} />
          </Route>
          </Route>
          </Routes>
        </main>
        {showPublicChrome && !hideFooterForFormFlow && <Footer />}
        <AIChatWidget />
        </>
      </BookingFlowChromeProvider>
  )
}

export default App
