import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getNavDashboardPath, needsOnboarding, type UserRole } from '../lib/authProfile'

function finishSetupHref(r: UserRole): string {
  if (r === null) return '/onboarding'
  if (r === 'student') return '/onboarding/student'
  return '/onboarding/landlord'
}
import { formatDisplayName } from '../lib/formatDisplayName'
import SiteBrandLockup from './SiteBrandLockup'
import AiSparkleIcon from './AiSparkleIcon'

const SERVICE_LINKS = [
  { to: '/services/student-accommodation', label: 'Student Accommodation' },
  { to: '/services/property-management', label: 'Property Management' },
  { to: '/services/landlord-partnerships', label: 'Landlord Partnerships' },
  { to: '/services/fully-furnished', label: 'Fully Furnished Units' },
] as const

const NAV_BEFORE_SERVICES = [
  { to: '/listings', label: 'Listings' },
  { to: '/student-accommodation', label: 'Student Accommodation' },
  { to: '/about', label: 'About' },
] as const

const coralCtaClass =
  'inline-flex items-center justify-center gap-1 rounded-lg bg-[#FF6F61] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]'

export default function Header() {
  const { user, profile, loading, signOut, role } = useAuthContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
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

  useEffect(() => {
    if (!mobileNavOpen) setMobileServicesOpen(false)
  }, [mobileNavOpen])

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
    user && (role === 'student' || role === 'landlord' || role === 'admin')
      ? getNavDashboardPath(role, profile)
      : '/onboarding'
  const profileHref =
    role === 'student'
      ? '/student-profile'
      : role === 'landlord'
        ? '/landlord-profile'
        : role === 'admin'
          ? '/admin'
          : '/onboarding'

  const showDashboardInAuth = Boolean(user) && (role === 'student' || role === 'landlord')

  async function handleSignOut() {
    setMenuOpen(false)
    setMobileNavOpen(false)
    await signOut()
  }

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  return (
    <header className="pt-safe-top w-full shrink-0 bg-[var(--brand-header-bg)] border-b border-[var(--brand-header-border)] z-50 max-md:fixed max-md:inset-x-0 max-md:top-0 md:sticky md:top-0">
      <div ref={mobileNavRootRef} className="max-w-site mx-auto w-full px-3 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
        <SiteBrandLockup />

        <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center min-w-0">
          {NAV_BEFORE_SERVICES.map((item) => (
            <Link key={item.to} to={item.to} className="text-gray-600 hover:text-gray-900 text-sm shrink-0">
              {item.label}
            </Link>
          ))}
          <div className="relative shrink-0" ref={servicesRef}>
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
                <Link
                  to="/pricing"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setServicesOpen(false)}
                >
                  Pricing
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
          <Link to="/contact" className="text-gray-600 hover:text-gray-900 text-sm shrink-0">
            Contact
          </Link>
          {role === 'admin' && (
            <Link to="/admin" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 shrink-0">
              Admin dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
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
              {showDashboardInAuth && (
                <Link
                  to={dashboardHref}
                  className="hidden sm:inline text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Dashboard
                </Link>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1 rounded-full border border-gray-200 p-1 hover:bg-gray-50"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Account menu"
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
                  <svg
                    className="w-4 h-4 text-gray-500 mr-1 hidden sm:block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
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
                    ) : needsOnboarding(role, profile) ? (
                      <Link
                        to={finishSetupHref(role)}
                        className="block px-4 py-2 text-sm text-amber-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Finish setup
                      </Link>
                    ) : (
                      <Link
                        to={profileHref}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
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
                className="text-gray-600 hover:text-gray-900 text-sm inline"
              >
                Log in
              </Link>
              <Link to="/signup" className={coralCtaClass}>
                Sign up
                <span aria-hidden>→</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="inline-flex md:hidden shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50"
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
        </div>
        </div>

        {mobileNavOpen && (
          <>
            <div
              className="fixed inset-0 z-[55] bg-black/25 md:hidden"
              aria-hidden
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-[60] flex w-[min(100%,20rem)] flex-col border-l border-gray-100 bg-white pt-safe-top shadow-xl md:hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-50"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                {NAV_BEFORE_SERVICES.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                    onClick={closeMobileNav}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => setMobileServicesOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
                  aria-expanded={mobileServicesOpen}
                >
                  <span>Services</span>
                  <svg
                    className={`w-4 h-4 shrink-0 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileServicesOpen && (
                  <div className="border-b border-gray-100 pb-2">
                    <Link
                      to="/services"
                      className="block py-2 pl-6 pr-4 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={closeMobileNav}
                    >
                      All services
                    </Link>
                    <Link
                      to="/pricing"
                      className="block py-2 pl-6 pr-4 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={closeMobileNav}
                    >
                      Pricing
                    </Link>
                    {SERVICE_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="block py-2 pl-6 pr-4 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={closeMobileNav}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  to="/contact"
                  className="block px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                  onClick={closeMobileNav}
                >
                  Contact
                </Link>
                <Link
                  to="/landlords/ai"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#FF6F61] hover:bg-[#FF6F61]/5"
                  onClick={closeMobileNav}
                >
                  <AiSparkleIcon className="h-5 w-5 shrink-0" />
                  Landlord AI
                </Link>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-gray-50"
                    onClick={closeMobileNav}
                  >
                    Admin dashboard
                  </Link>
                )}
              </nav>

              <div className="border-t border-gray-100 p-4 space-y-3">
                {user ? (
                  <>
                    {showDashboardInAuth && (
                      <Link
                        to={dashboardHref}
                        className="block text-sm font-medium text-gray-900 hover:text-gray-700"
                        onClick={closeMobileNav}
                      >
                        Dashboard
                      </Link>
                    )}
                    {needsOnboarding(role, profile) ? (
                      <Link
                        to={finishSetupHref(role)}
                        className="block text-sm text-amber-700"
                        onClick={closeMobileNav}
                      >
                        Finish setup
                      </Link>
                    ) : role !== 'admin' ? (
                      <Link
                        to={profileHref}
                        className="block text-sm text-gray-600 hover:text-gray-900"
                        onClick={closeMobileNav}
                      >
                        Profile
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="block text-sm text-gray-600 hover:text-gray-900"
                    onClick={closeMobileNav}
                  >
                    Log in
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
