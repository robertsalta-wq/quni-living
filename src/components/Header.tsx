import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getDashboardPath } from '../lib/authProfile'
import { formatDisplayName } from '../lib/formatDisplayName'

const SERVICE_LINKS = [
  { to: '/services/student-accommodation', label: 'Student Accommodation' },
  { to: '/services/property-management', label: 'Property Management' },
  { to: '/services/landlord-partnerships', label: 'Landlord Partnerships' },
  { to: '/services/fully-furnished', label: 'Fully Furnished Units' },
] as const

const MAIN_NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/listings', label: 'Listings' },
  { to: '/listings', label: 'Search' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const

export default function Header() {
  const { user, profile, loading, signOut, role } = useAuthContext()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const mobileNavRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      const t = e.target as Node
      if (menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false)
      }
      if (servicesRef.current && !servicesRef.current.contains(t)) {
        setServicesOpen(false)
      }
      if (mobileNavRootRef.current && !mobileNavRootRef.current.contains(t)) {
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const displayName = (() => {
    let raw: string | undefined
    if (profile && (role === 'student' || role === 'landlord')) {
      const p = profile as {
        first_name?: string | null
        last_name?: string | null
        full_name?: string | null
      }
      const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean)
      raw = parts.length > 0 ? parts.join(' ') : p.full_name?.trim()
    }
    if (!raw) raw = (user?.user_metadata?.full_name as string | undefined)?.trim()
    if (!raw) raw = (user?.user_metadata?.name as string | undefined)?.trim()
    if (!raw) raw = user?.email?.split('@')[0]
    const formatted = formatDisplayName(raw)
    return formatted || 'Account'
  })()

  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const profilePhotoUrl = profile?.avatar_url?.trim() || null

  const dashboardHref =
    role === 'admin'
      ? '/admin'
      : role === 'student' || role === 'landlord'
        ? getDashboardPath(role)
        : '/onboarding'
  const profileHref =
    role === 'student' ? '/student-profile' : role === 'landlord' ? '/landlord-profile' : role === 'admin' ? '/admin' : '/onboarding'

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className="w-full bg-[#FEF9E4] border-b border-[#E8E0CC] sticky top-0 z-50">
      <div
        className="max-w-site mx-auto w-full px-3 py-4 sm:px-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 md:flex md:items-center md:justify-between md:gap-4"
      >
        <Link
          to="/"
          className="flex min-w-0 items-center justify-self-start shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 rounded-sm"
        >
          <img
            src="/quni-logo.png"
            alt="Quni"
            className="h-9 w-auto max-w-full object-contain object-left sm:h-10"
          />
        </Link>

        <div className="relative flex justify-center justify-self-center md:hidden" ref={mobileNavRootRef}>
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
            aria-expanded={mobileNavOpen}
            aria-haspopup="true"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          {mobileNavOpen && (
            <>
              <div
                className="fixed inset-0 z-[55] bg-black/25 md:hidden"
                aria-hidden
                onClick={() => setMobileNavOpen(false)}
              />
              <div className="fixed left-3 right-3 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-[60] max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white py-2 shadow-lg md:hidden">
                {MAIN_NAV_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Services</p>
                <Link
                  to="/services"
                  className="block px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  onClick={() => setMobileNavOpen(false)}
                >
                  All services
                </Link>
                {SERVICE_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm">
            Home
          </Link>
          <Link to="/listings" className="text-gray-600 hover:text-gray-900 text-sm">
            Listings
          </Link>
          <Link to="/search" className="text-gray-600 hover:text-gray-900 text-sm">
            Search
          </Link>
          <Link to="/about" className="text-gray-600 hover:text-gray-900 text-sm">
            About
          </Link>
          <div className="relative" ref={servicesRef}>
            <button
              type="button"
              onClick={() => setServicesOpen((o) => !o)}
              className="text-gray-600 hover:text-gray-900 text-sm inline-flex items-center gap-1"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
            >
              Services
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {servicesOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1 shadow-lg z-50">
                <Link
                  to="/services"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                  onClick={() => setServicesOpen(false)}
                >
                  All services
                </Link>
                <div className="border-t border-gray-100 my-1" />
                {SERVICE_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setServicesOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/contact" className="text-gray-600 hover:text-gray-900 text-sm">
            Contact
          </Link>
          {role === 'admin' && (
            <Link
              to="/admin"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Admin dashboard
            </Link>
          )}
        </nav>

        <div className="flex min-w-0 items-center justify-end justify-self-end gap-1 sm:gap-2 md:gap-3 shrink-0">
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <>
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="md:hidden text-sm font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                >
                  Admin
                </Link>
              )}
              <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-gray-200 pl-1 pr-3 py-1 hover:bg-gray-50"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover border border-gray-200 bg-gray-100"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-800">
                    {initials}
                  </span>
                )}
                {role === 'admin' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                    Admin
                  </span>
                )}
                <span className="hidden md:inline text-sm text-gray-700 max-w-[120px] truncate">
                  {displayName}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-1 shadow-lg z-50">
                  {role === 'admin' ? (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin dashboard
                    </Link>
                  ) : !user.user_metadata?.role || !profile ? (
                    <Link
                      to="/onboarding"
                      className="block px-4 py-2 text-sm text-amber-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Finish setup
                    </Link>
                  ) : (
                    <>
                      <Link
                        to={dashboardHref}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to={profileHref}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 text-sm hidden sm:inline"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50 hidden sm:inline-block"
              >
                Sign up
              </Link>
              <Link
                to="/signup?role=student"
                className="whitespace-nowrap rounded border border-gray-900 px-1.5 py-1.5 text-[11px] text-gray-900 hover:bg-gray-50 md:px-3 md:py-2 md:text-sm"
              >
                <span className="md:hidden">Student</span>
                <span className="hidden md:inline">I&apos;m a student</span>
              </Link>
              <Link
                to="/services/landlord-partnerships"
                className="whitespace-nowrap rounded border border-gray-900 px-1.5 py-1.5 text-[11px] text-gray-900 hover:bg-gray-50 md:px-3 md:py-2 md:text-sm"
              >
                <span className="md:hidden">Landlord</span>
                <span className="hidden md:inline">I&apos;m a landlord</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
