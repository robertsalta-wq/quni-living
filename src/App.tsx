import { lazy, Suspense, useLayoutEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { apexAuthTokenRedirectPath } from './lib/authCallbackParams'
import ScrollToTop from './components/ScrollToTop'
import NativePushNotificationsInitializer from './components/NativePushNotificationsInitializer'
import SeoPrivateRoutes from './components/SeoPrivateRoutes'
import PageRouteFallback from './components/PageRouteFallback'
import { ProtectedRoute, RequireUser } from './components/ProtectedRoute'
import AskAiFab from './components/aiChat/AskAiFab'
import { AiChatOpenProvider } from './context/AiChatOpenContext'
import { BookingFlowChromeProvider } from './context/BookingFlowChromeContext'
import LandlordDashboardRedirect from './lib/LandlordDashboardRedirect'
import LandlordProfileRedirect from './lib/LandlordProfileRedirect'
import { landlordDashboardProfilePath } from './lib/landlordDashboardProfilePaths'
import Home from './pages/Home'
import NotFoundPage from './pages/NotFoundPage'
import { isDeskShellEnabled } from './lib/deskShell'
import * as Lazy from './lazyPages'
import * as Marketing from './marketingRoutePages'
import { prefetchRouteChunks } from './lib/routePrefetch'
import MarketingChromeLayout from './components/appShell/MarketingChromeLayout'

/** Authenticated shell stays off the marketing `/` critical path. */
const AppShellLayout = lazy(() => import('./components/appShell/AppShellLayout'))

function AdminPropertyFeesDeepLinkRedirect() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const q = encodeURIComponent(propertyId ?? '')
  return <Navigate to={`/admin/properties?fees=${q}`} replace />
}

function LazyOutlet() {
  return (
    <Suspense fallback={<PageRouteFallback />}>
      <Outlet />
    </Suspense>
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const authRedirect = apexAuthTokenRedirectPath(
      location.pathname,
      location.search,
      location.hash,
    )
    if (authRedirect) {
      navigate(authRedirect, { replace: true })
      return
    }
    prefetchRouteChunks(location.pathname)
  }, [location.pathname, location.search, location.hash, navigate])

  return (
    <BookingFlowChromeProvider>
      <AiChatOpenProvider>
        <ScrollToTop />
        <NativePushNotificationsInitializer />
        <SeoPrivateRoutes />
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <Routes>
            {/* Authenticated app shell - section + focus destinations */}
            <Route
              element={
                <Suspense fallback={<PageRouteFallback />}>
                  <AppShellLayout />
                </Suspense>
              }
            >
              <Route
                path="/messages/:conversationId?"
                element={
                  <RequireUser>
                    <Lazy.MessagesPage />
                  </RequireUser>
                }
              />
              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute allowedRoles={['renter']}>
                    <Lazy.StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student-profile"
                element={
                  <ProtectedRoute allowedRoles={['renter']}>
                    <Lazy.StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/profile"
                element={
                  <ProtectedRoute allowedRoles={['renter']}>
                    <Lazy.StudentProfile />
                  </ProtectedRoute>
                }
              />
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
                path="/landlord/property/new"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/property/new/basic"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/property/new/section/:sectionId"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/property/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/property/edit/:id/basic"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/landlord/property/edit/:id/section/:sectionId"
                element={
                  <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                    <Lazy.LandlordListingEditEntry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/:propertyId"
                element={
                  <ProtectedRoute
                    allowedRoles={['renter']}
                    redirectUnauthenticatedToStudentSignup
                    requireStudentListingActions
                  >
                    <Lazy.Booking />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* AI landing - no marketing header; SSR-eager / client-lazy */}
            <Route
              path="/landlords/ai"
              element={
                <Suspense fallback={<PageRouteFallback />}>
                  <Marketing.LandlordAIFeaturePage />
                </Suspense>
              }
            />

            {/*
              Landlord desk - same URL in Preview (desk_shell_enabled) and Production.
              Production: Edge middleware issues HTTP 302 → partnerships; client Navigate matches.
              Never 301 - permanent redirect caches poison the real URL.
            */}
            <Route
              path="/for-landlords"
              element={
                isDeskShellEnabled() ? (
                  <Suspense fallback={<PageRouteFallback />}>
                    <Marketing.ForLandlords />
                  </Suspense>
                ) : (
                  <Navigate to="/services/landlord-partnerships" replace />
                )
              }
            />

            {/* Admin - own layout */}
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
              <Route path="search" element={<Lazy.AdminSearch />} />
              <Route path="payments" element={<Lazy.AdminPayments />} />
              <Route path="settings" element={<Lazy.AdminSettings />} />
              <Route path="team" element={<Lazy.AdminTeam />} />
              <Route path="pricing" element={<Lazy.PricingPage />} />
              <Route path="knowledge-base" element={<Lazy.KnowledgeBase />} />
              <Route path="feature-inventory" element={<Lazy.AdminFeatureInventory />} />
              <Route path="documents" element={<Lazy.DocumentsPage />} />
              <Route path="agreement-previews" element={<Lazy.AgreementPreviewsPage />} />
              <Route path="domains" element={<Lazy.DomainsPage />} />
              <Route path="trust-checklist" element={<Lazy.TrustChecklist />} />
              <Route path="document-access-log" element={<Lazy.AdminDocumentAccessLog />} />
              <Route path="support-lookup" element={<Lazy.AdminSupportLookup />} />
              <Route path="open-items" element={<Lazy.AdminOpenItems />} />
              <Route path="state-workflows" element={<Lazy.AdminStateWorkflows />} />
              <Route path="qase" element={<Lazy.QaseTicketList />} />
              <Route path="qase/settings" element={<Lazy.QaseSettings />} />
              <Route path="qase/:ticketId" element={<Lazy.QaseTicketDetail />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Marketing / auth - public Header + Footer */}
            <Route element={<MarketingChromeLayout />}>
              {/* Home stays sync on the client (LCP). Other marketing/SEO pages are
                  SSR-eager via marketingRoutePages + client-lazy under Suspense. */}
              <Route path="/" element={<Home />} />
              <Route element={<LazyOutlet />}>
                <Route path="/guides" element={<Marketing.Guides />} />
                <Route path="/guides/:slug" element={<Marketing.GuideArticlePage />} />
                <Route path="/for-universities" element={<Marketing.ForUniversities />} />
                <Route path="/listings" element={<Marketing.Listings />} />
                <Route path="/pricing" element={<Marketing.Pricing />} />
                <Route path="/faq" element={<Marketing.Faq />} />
                <Route path="/how-it-works" element={<Marketing.HowItWorks />} />
                <Route path="/verification" element={<Marketing.Verification />} />
                <Route path="/contact" element={<Marketing.Contact />} />
                <Route
                  path="/services/landlord-partnerships"
                  element={<Marketing.LandlordPartnerships />}
                />
                <Route
                  path="/student-accommodation/:universitySlug/:campusSlug"
                  element={<Marketing.CampusAccommodation />}
                />
                <Route
                  path="/student-accommodation/:universitySlug"
                  element={<Marketing.UniversityAccommodation />}
                />
                <Route path="/listings/:slug" element={<Marketing.PropertyDetail />} />
                <Route path="/properties/:slug" element={<Marketing.PropertyDetail />} />
                <Route path="/search" element={<Navigate to="/listings" replace />} />
                <Route path="/properties" element={<Navigate to="/listings" replace />} />
                <Route path="/rent-near-campus" element={<Lazy.RentNearCampus />} />
                <Route path="/international" element={<Lazy.InternationalStudents />} />
                <Route path="/student-accommodation" element={<Lazy.StudentAccommodationIndex />} />
                <Route path="/terms" element={<Lazy.Terms />} />
                <Route path="/privacy" element={<Lazy.Privacy />} />
                <Route path="/non-discrimination" element={<Lazy.NonDiscrimination />} />
                <Route path="/landlord-service-agreement" element={<Lazy.LandlordServiceAgreement />} />
                <Route path="/about" element={<Lazy.About />} />
                <Route path="/refunds" element={<Lazy.Refunds />} />
                <Route path="/services" element={<Lazy.Services />} />
                <Route
                  path="/services/student-accommodation"
                  element={<Lazy.ServiceStudentAccommodation />}
                />
                <Route
                  path="/services/property-management"
                  element={<Lazy.ServicePropertyManagement />}
                />
                <Route path="/services/fully-furnished" element={<Lazy.ServiceFullyFurnished />} />
                <Route path="/list-your-room" element={<Marketing.ListYourRoomE />} />
                <Route path="/list-your-room-b" element={<Lazy.ListYourRoomB />} />
                <Route path="/list-your-room-c" element={<Lazy.ListYourRoomC />} />
                <Route
                  path="/list-your-room-e"
                  element={<Navigate to="/list-your-room" replace />}
                />
                <Route
                  path="/landlord/onboarding"
                  element={<Navigate to="/landlord/dashboard?tab=profile" replace />}
                />

                <Route path="/auth/callback" element={<Marketing.AuthCallback />} />
                <Route path="/login" element={<Lazy.Login />} />
                <Route path="/forgot-password" element={<Lazy.ForgotPassword />} />
                <Route path="/reset-password" element={<Lazy.ResetPassword />} />
                <Route path="/verify-email" element={<Lazy.VerifyEmail />} />
                <Route path="/signup" element={<Lazy.Signup />} />
                <Route path="/invite/:token" element={<Lazy.InviteTenantPage />} />
                <Route path="/student-signup" element={<Lazy.StudentSignup />} />
                <Route path="/landlord-signup" element={<Lazy.LandlordSignup />} />

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
                    <ProtectedRoute allowedRoles={['renter']}>
                      <Navigate to="/student-profile" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/onboarding/landlord"
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <Navigate to={landlordDashboardProfilePath()} replace />
                    </ProtectedRoute>
                  }
                />

                <Route path="/landlord-dashboard" element={<LandlordDashboardRedirect />} />
                <Route
                  path="/landlord-profile"
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordProfileRedirect />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/landlord/profile"
                  element={
                    <ProtectedRoute allowedRoles={['landlord']}>
                      <LandlordProfileRedirect />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sample-agreements"
                  element={
                    <ProtectedRoute allowedRoles={['renter', 'landlord', 'admin']}>
                      <Lazy.SampleAgreementsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
          <AskAiFab />
        </div>
      </AiChatOpenProvider>
    </BookingFlowChromeProvider>
  )
}

export default App
