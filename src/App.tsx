import * as Sentry from '@sentry/react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import FeedbackButton from './components/FeedbackButton'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import SeoPrivateRoutes from './components/SeoPrivateRoutes'
import { ProtectedRoute, RequireUser } from './components/ProtectedRoute'
import Home from './pages/Home'
import Listings from './pages/Listings'
import PropertyDetail from './pages/PropertyDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import StudentSignup from './pages/StudentSignup'
import LandlordSignup from './pages/LandlordSignup'
import StudentDashboard from './pages/StudentDashboard'
import LandlordDashboard from './pages/LandlordDashboard'
import StudentProfile from './pages/StudentProfile'
import LandlordProfile from './pages/LandlordProfile'
import LandlordPropertyFormPage from './pages/landlord/LandlordPropertyFormPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminBookings from './pages/admin/AdminBookings'
import AdminEnquiries from './pages/admin/AdminEnquiries'
import AdminLandlordLeads from './pages/admin/AdminLandlordLeads'
import AdminProperties from './pages/admin/AdminProperties'
import AdminStudents from './pages/admin/AdminStudents'
import AdminLandlords from './pages/admin/AdminLandlords'
import AdminApps from './pages/admin/AdminApps'
import AdminPayments from './pages/admin/AdminPayments'
import AuthCallback from './pages/auth/AuthCallback'
import Onboarding from './pages/Onboarding'
import Booking from './pages/Booking'
import About from './pages/About'
import Pricing from './pages/Pricing'
import Contact from './pages/Contact'
import Services from './pages/Services'
import ServiceStudentAccommodation from './pages/services/StudentAccommodation'
import ServicePropertyManagement from './pages/services/PropertyManagement'
import ServiceLandlordPartnerships from './pages/services/LandlordPartnerships'
import ServiceFullyFurnished from './pages/services/FullyFurnished'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import LandlordServiceAgreement from './pages/LandlordServiceAgreement'
import StudentOnboarding from './pages/onboarding/StudentOnboarding'
import LandlordOnboarding from './pages/onboarding/LandlordOnboarding'
import StudentAccommodationIndex from './pages/seo/StudentAccommodationIndex'
import UniversityAccommodation from './pages/seo/UniversityAccommodation'
import CampusAccommodation from './pages/seo/CampusAccommodation'
import LandlordAIFeaturePage from './pages/LandlordAIFeaturePage'

function App() {
  const location = useLocation()
  const adminShell = location.pathname.startsWith('/admin')
  const aiLandingShell = location.pathname === '/landlords/ai'

  return (
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
      <>
        <ScrollToTop />
        <SeoPrivateRoutes />
        {!adminShell && !aiLandingShell && <Header />}
        <main className="flex-1 flex flex-col min-h-0 w-full min-w-0">
          <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/student-accommodation" element={<StudentAccommodationIndex />} />
          <Route path="/student-accommodation/:universitySlug" element={<UniversityAccommodation />} />
          <Route
            path="/student-accommodation/:universitySlug/:campusSlug"
            element={<CampusAccommodation />}
          />
          <Route path="/listings/:slug" element={<PropertyDetail />} />
          <Route path="/search" element={<Navigate to="/listings" replace />} />
          <Route path="/properties" element={<Navigate to="/listings" replace />} />
          <Route path="/properties/:slug" element={<PropertyDetail />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/landlord-service-agreement" element={<LandlordServiceAgreement />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/student-accommodation" element={<ServiceStudentAccommodation />} />
          <Route path="/services/property-management" element={<ServicePropertyManagement />} />
          <Route path="/services/landlord-partnerships" element={<ServiceLandlordPartnerships />} />
          <Route path="/services/fully-furnished" element={<ServiceFullyFurnished />} />
          <Route path="/for-landlords" element={<Navigate to="/services/landlord-partnerships" replace />} />
          <Route path="/landlords/ai" element={<LandlordAIFeaturePage />} />
          <Route path="/landlord/onboarding" element={<Navigate to="/onboarding/landlord" replace />} />

          {/* Auth */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/landlord-signup" element={<LandlordSignup />} />

          <Route
            path="/onboarding"
            element={
              <RequireUser>
                <Onboarding />
              </RequireUser>
            }
          />
          <Route
            path="/onboarding/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding/landlord"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected (session + profile + metadata role) */}
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/landlord-dashboard" element={<Navigate to="/landlord/dashboard" replace />} />
          <Route
            path="/landlord/dashboard"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord-profile"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/profile"
            element={
              <ProtectedRoute allowedRoles={['landlord']}>
                <LandlordProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/property/new"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                <LandlordPropertyFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord/property/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['landlord', 'admin']}>
                <LandlordPropertyFormPage />
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
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="landlord-leads" element={<AdminLandlordLeads />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="landlords" element={<AdminLandlords />} />
            <Route path="apps" element={<AdminApps />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>
          </Routes>
        </main>
        {!adminShell && !aiLandingShell && <Footer />}
        <FeedbackButton />
      </>
    </Sentry.ErrorBoundary>
  )
}

export default App
