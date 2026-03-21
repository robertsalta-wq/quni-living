import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import { ProtectedRoute, RequireUser } from './components/ProtectedRoute'
import Home from './pages/Home'
import Listings from './pages/Listings'
import Search from './pages/Search'
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

function App() {
  const location = useLocation()
  const adminShell = location.pathname.startsWith('/admin')

  return (
    <>
      {!adminShell && <Header />}
      <main className="flex-1 w-full min-w-0 min-h-0">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/search" element={<Search />} />
          <Route path="/properties/:slug" element={<PropertyDetail />} />

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
              <ProtectedRoute allowedRoles={['landlord', 'admin']}>
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
              <ProtectedRoute allowedRoles={['student']}>
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
            <Route path="properties" element={<AdminProperties />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="landlords" element={<AdminLandlords />} />
            <Route path="apps" element={<AdminApps />} />
          </Route>
        </Routes>
      </main>
    </>
  )
}

export default App
