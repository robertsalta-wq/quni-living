import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
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
import AdminProperties from './pages/admin/AdminProperties'
import AdminStudents from './pages/admin/AdminStudents'
import AdminLandlords from './pages/admin/AdminLandlords'
import AdminApps from './pages/admin/AdminApps'
import AuthCallback from './pages/auth/AuthCallback'
import Onboarding from './pages/Onboarding'
import Booking from './pages/Booking'
import About from './pages/About'
import Contact from './pages/Contact'
import Services from './pages/Services'
import ServiceStudentAccommodation from './pages/services/StudentAccommodation'
import ServicePropertyManagement from './pages/services/PropertyManagement'
import ServiceLandlordPartnerships from './pages/services/LandlordPartnerships'
import ServiceFullyFurnished from './pages/services/FullyFurnished'

function App() {
  const location = useLocation()
  const adminShell = location.pathname.startsWith('/admin')

  return (
    <>
      {!adminShell && <Header />}
      <main className="flex-1 flex flex-col min-h-0 w-full min-w-0">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/search" element={<Navigate to="/listings" replace />} />
          <Route path="/properties/:slug" element={<PropertyDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/student-accommodation" element={<ServiceStudentAccommodation />} />
          <Route path="/services/property-management" element={<ServicePropertyManagement />} />
          <Route path="/services/landlord-partnerships" element={<ServiceLandlordPartnerships />} />
          <Route path="/services/fully-furnished" element={<ServiceFullyFurnished />} />
          <Route path="/for-landlords" element={<Navigate to="/services/landlord-partnerships" replace />} />

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
            path="/landlord-dashboard"
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
            path="/booking"
            element={
              <RequireUser>
                <Booking />
              </RequireUser>
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
            <Route path="properties" element={<AdminProperties />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="landlords" element={<AdminLandlords />} />
            <Route path="apps" element={<AdminApps />} />
          </Route>
        </Routes>
      </main>
      {!adminShell && <Footer />}
    </>
  )
}

export default App
