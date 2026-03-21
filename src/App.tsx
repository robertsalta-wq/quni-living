import { Routes, Route } from 'react-router-dom'
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
import PropertyForm from './pages/PropertyForm'
import Admin from './pages/Admin'
import AuthCallback from './pages/auth/AuthCallback'
import Onboarding from './pages/Onboarding'
import Booking from './pages/Booking'

function App() {
  return (
    <>
      <Header />
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
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-profile"
            element={
              <ProtectedRoute>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord-dashboard"
            element={
              <ProtectedRoute>
                <LandlordDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/landlord-profile"
            element={
              <ProtectedRoute>
                <LandlordProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />

          <Route path="/property-form" element={<PropertyForm />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </>
  )
}

export default App
