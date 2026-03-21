import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getDashboardPath } from '../lib/authProfile'
import { formatDisplayName } from '../lib/formatDisplayName'

export default function Header() {
  const { user, profile, loading, signOut, role } = useAuthContext()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
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
      <div className="max-w-site mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 rounded-sm">
          <img
            src="/quni-logo.png"
            alt="Quni"
            className="h-9 sm:h-10 w-auto object-contain object-left"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-gray-600 hover:text-gray-900 text-sm">
            Home
          </Link>
          <Link to="/listings" className="text-gray-600 hover:text-gray-900 text-sm">
            Listings
          </Link>
          <Link to="/search" className="text-gray-600 hover:text-gray-900 text-sm">
            Search
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                <span className="hidden sm:inline text-sm text-gray-700 max-w-[120px] truncate">
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
                to="/signup"
                className="border border-gray-900 text-gray-900 px-2 sm:px-3 py-2 rounded text-sm hover:bg-gray-50 text-xs sm:text-sm"
              >
                I&apos;m a student
              </Link>
              <Link
                to="/signup"
                className="border border-gray-900 text-gray-900 px-2 sm:px-3 py-2 rounded text-sm hover:bg-gray-50 text-xs sm:text-sm"
              >
                I&apos;m a landlord
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
