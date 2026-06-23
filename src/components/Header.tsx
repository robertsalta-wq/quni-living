import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getNavDashboardPath, isRenterRole, needsOnboarding, type UserRole } from '../lib/authProfile'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'
import { formatDisplayName } from '../lib/formatDisplayName'
import SiteBrandLockup from './SiteBrandLockup'
import AiSparkleIcon from './AiSparkleIcon'
import SiteSocialLinks from './SiteSocialLinks'
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount'
import { warmListingsBrowseCache } from '../lib/listingsBrowseCache'

function finishSetupHref(r: UserRole): string {
  if (r === null) return '/onboarding'
  if (isRenterRole(r)) return '/onboarding/student'
  return '/onboarding/landlord'
}

const LANDLORD_NAV_TO = '/for-landlords'

const STUDENT_NAV_ITEMS = [
  { to: '/student-accommodation', label: 'Browse by university' },
  { to: '/international', label: 'International students' },
  { to: '/rent-near-campus', label: 'Rent near campus' },
  { to: '/guides', label: 'Guides & advice' },
] as const

const mainNavLinkClass = 'whitespace-nowrap text-sm text-gray-600 hover:text-gray-900'
const secondaryNavLinkClass = 'whitespace-nowrap text-sm text-[#1B2A4A]/75 hover:text-[#1B2A4A]'

const MOBILE_QUICK_NAV = [{ to: '/listings', label: 'Listings' }] as const

const coralCtaClass =
  'inline-flex items-center justify-center gap-1 rounded-lg bg-[#FF6F61] px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61] sm:px-4 sm:py-2 sm:text-sm'

const mobileListingsPillClass =
  'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#FF6F61] bg-[#FF6F61] px-2.5 py-0.5 text-[11px] font-semibold leading-tight text-white shadow-sm hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61] sm:px-3 sm:py-1 sm:text-xs'

const mobileDrawerRowClass =
  'flex min-h-11 items-center px-4 text-sm text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#FF6F61]/40'

const ACCOUNT_MENU_WIDTH_PX = 208
const STUDENTS_MENU_WIDTH_PX = 260

function studentsMenuLeft(anchor: DOMRect): number {
  const centered = anchor.left + anchor.width / 2 - STUDENTS_MENU_WIDTH_PX / 2
  const maxLeft = window.innerWidth - STUDENTS_MENU_WIDTH_PX - 8
  return Math.max(8, Math.min(centered, maxLeft))
}

function warmListingsNav() {
  warmListingsBrowseCache()
}

export default function Header() {
  const { user, profile, loading, signOut, role } = useAuthContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null)
  const [studentsOpen, setStudentsOpen] = useState(false)
  const [studentsAnchor, setStudentsAnchor] = useState<DOMRect | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const studentsButtonRef = useRef<HTMLButtonElement>(null)
  const studentsPanelRef = useRef<HTMLDivElement>(null)
  const mobileNavRootRef = useRef<HTMLDivElement>(null)

  function syncMenuAnchor() {
    const rect = menuButtonRef.current?.getBoundingClientRect()
    if (rect) setMenuAnchor(rect)
  }

  function closeAccountMenu() {
    setMenuOpen(false)
    setMenuAnchor(null)
  }

  function syncStudentsAnchor() {
    const rect = studentsButtonRef.current?.getBoundingClientRect()
    if (rect) setStudentsAnchor(rect)
  }

  function closeStudentsMenu() {
    setStudentsOpen(false)
    setStudentsAnchor(null)
  }

  function toggleAccountMenu() {
    if (menuOpen) {
      closeAccountMenu()
      return
    }
    closeStudentsMenu()
    syncMenuAnchor()
    setMenuOpen(true)
  }

  function toggleStudentsMenu() {
    if (studentsOpen) {
      closeStudentsMenu()
      return
    }
    closeAccountMenu()
    syncStudentsAnchor()
    setStudentsOpen(true)
  }

  useEffect(() => {
    if (!studentsOpen) return
    syncStudentsAnchor()
    function onLayout() {
      syncStudentsAnchor()
    }
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [studentsOpen])

  useEffect(() => {
    if (!menuOpen) return
    syncMenuAnchor()
    function onLayout() {
      syncMenuAnchor()
    }
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAccountMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (!studentsOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeStudentsMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [studentsOpen])

  useEffect(() => {
    if (!studentsOpen) return
    function closeStudents(e: MouseEvent) {
      const t = e.target as Node
      if (studentsButtonRef.current?.contains(t)) return
      if (studentsPanelRef.current?.contains(t)) return
      closeStudentsMenu()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('click', closeStudents)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('click', closeStudents)
    }
  }, [studentsOpen])

  useEffect(() => {
    if (!menuOpen) return
    function closeMenu(e: MouseEvent) {
      const t = e.target as Node
      if (menuButtonRef.current?.contains(t)) return
      if (menuPanelRef.current?.contains(t)) return
      closeAccountMenu()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('click', closeMenu)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('click', closeMenu)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!mobileNavOpen) return
    function closeMobile(e: MouseEvent) {
      const t = e.target as Node
      if (mobileNavRootRef.current && !mobileNavRootRef.current.contains(t)) {
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('click', closeMobile)
    return () => document.removeEventListener('click', closeMobile)
  }, [mobileNavOpen])

  useEffect(() => {
    warmListingsBrowseCache()
  }, [])

  const listingsNavWarm = { onMouseEnter: warmListingsNav, onFocus: warmListingsNav, onTouchStart: warmListingsNav }

  const displayName = (() => {
    let raw: string | undefined
    if (profile && (isRenterRole(role) || role === 'landlord')) {
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
    user && (isRenterRole(role) || role === 'landlord' || role === 'admin')
      ? getNavDashboardPath(role, profile, user.id)
      : '/onboarding'
  const profileHref =
    isRenterRole(role)
      ? '/student-profile'
      : role === 'landlord'
        ? '/landlord-profile'
        : role === 'admin'
          ? '/admin'
          : '/onboarding'

  const showDashboardInAuth = Boolean(user) && (isRenterRole(role) || role === 'landlord')
  const showMessagesNav = Boolean(user) && (isRenterRole(role) || role === 'landlord')
  const unreadMessageCount = useUnreadMessageCount(showMessagesNav ? user?.id : undefined)

  async function handleSignOut() {
    closeAccountMenu()
    closeStudentsMenu()
    setMobileNavOpen(false)
    await signOut()
  }

  function closeMobileNav() {
    closeStudentsMenu()
    setMobileNavOpen(false)
  }

  function renderStudentsNavDesktop() {
    return (
      <div className="relative">
        <button
          ref={studentsButtonRef}
          type="button"
          onClick={toggleStudentsMenu}
          className={`${mainNavLinkClass} inline-flex items-center gap-0.5`}
          aria-expanded={studentsOpen}
          aria-haspopup="menu"
        >
          For students
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {studentsOpen && studentsAnchor
          ? createPortal(
              <div
                ref={studentsPanelRef}
                role="menu"
                className="fixed z-[200] w-64 rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                style={{
                  top: studentsAnchor.bottom + 8,
                  left: studentsMenuLeft(studentsAnchor),
                }}
              >
                {STUDENT_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm leading-snug text-gray-700 hover:bg-gray-50"
                    onClick={closeStudentsMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>,
              document.body,
            )
          : null}
      </div>
    )
  }

  function renderStudentsNavMobile() {
    return (
      <div>
        <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">For students</p>
        {STUDENT_NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`${mobileDrawerRowClass} pl-8 text-gray-600`}
            onClick={closeMobileNav}
          >
            {item.label}
          </Link>
        ))}
      </div>
    )
  }

  return (
    <header className="pt-safe-top w-full max-w-full shrink-0 overflow-x-clip bg-[var(--brand-header-bg)] border-b border-[var(--brand-header-border)] z-50 max-md:fixed max-md:inset-x-0 max-md:top-0 md:sticky md:top-0">
      <div ref={mobileNavRootRef} className={`${SITE_CONTENT_MAX_CLASS} py-4`}>
        <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 md:gap-4">
        <div className="min-w-0 shrink-0">
          <SiteBrandLockup />
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <nav
            className="hidden md:flex min-w-0 items-center justify-center gap-3 overflow-x-hidden lg:gap-4 xl:gap-5"
            aria-label="Main"
          >
            <Link to="/listings" className={mainNavLinkClass} {...listingsNavWarm}>
              Listings
            </Link>
            {renderStudentsNavDesktop()}
            <Link to="/pricing" className={mainNavLinkClass}>
              Pricing
            </Link>
            <span className="mx-0.5 hidden h-4 w-px bg-[#1B2A4A]/15 lg:inline" aria-hidden />
            <Link to={LANDLORD_NAV_TO} className={secondaryNavLinkClass}>
              For landlords
            </Link>
            <Link to="/for-universities" className={secondaryNavLinkClass}>
              Universities
            </Link>
          </nav>
          <nav
            className="flex md:hidden min-w-0 items-center justify-center gap-3 overflow-x-hidden"
            aria-label="Main"
          >
            {MOBILE_QUICK_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={mobileListingsPillClass}
                {...listingsNavWarm}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <>
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <span className="lg:hidden">Admin</span>
                  <span className="hidden lg:inline">Admin dashboard</span>
                </Link>
              )}
              {showMessagesNav && (
                <Link
                  to="/messages"
                  className="hidden sm:inline-flex sm:items-center sm:gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#FF6F61] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </span>
                  )}
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
              <div className="relative">
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={toggleAccountMenu}
                  className="flex items-center gap-1 overflow-hidden rounded-full border border-gray-200 p-1 hover:bg-gray-50"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover bg-gray-100"
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
                {menuOpen &&
                  menuAnchor &&
                  createPortal(
                    <div
                      ref={menuPanelRef}
                      role="menu"
                      className="fixed z-[200] w-52 rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                      style={{
                        top: menuAnchor.bottom + 8,
                        left: Math.max(8, menuAnchor.right - ACCOUNT_MENU_WIDTH_PX),
                      }}
                    >
                      {showDashboardInAuth ? (
                        <Link
                          to={getNavDashboardPath(role, profile, user.id)}
                          role="menuitem"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
                          onClick={closeAccountMenu}
                        >
                          Dashboard
                        </Link>
                      ) : null}
                      {role === 'admin' ? (
                        <Link
                          to="/admin"
                          role="menuitem"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={closeAccountMenu}
                        >
                          Admin dashboard
                        </Link>
                      ) : needsOnboarding(role, profile, user.id) ? (
                        <Link
                          to={finishSetupHref(role)}
                          role="menuitem"
                          className="block px-4 py-2 text-sm text-amber-700 hover:bg-gray-50"
                          onClick={closeAccountMenu}
                        >
                          Finish setup
                        </Link>
                      ) : (
                        <Link
                          to={profileHref}
                          role="menuitem"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={closeAccountMenu}
                        >
                          Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleSignOut()}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        Sign out
                      </button>
                    </div>,
                    document.body,
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
                <span aria-hidden className="hidden sm:inline">→</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="inline-flex md:hidden shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 min-h-11 min-w-11"
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
              className="fixed inset-0 z-[80] bg-black/25 md:hidden"
              aria-hidden
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-[85] flex w-[min(100%,20rem)] flex-col border-l border-gray-100 bg-white pt-safe-top shadow-xl md:hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 min-h-11 min-w-11 inline-flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
                aria-label="Mobile"
              >
                <Link to="/listings" className={mobileDrawerRowClass} onClick={closeMobileNav} {...listingsNavWarm}>
                  Listings
                </Link>
                {renderStudentsNavMobile()}
                <Link to="/pricing" className={mobileDrawerRowClass} onClick={closeMobileNav}>
                  Pricing
                </Link>
                <Link to={LANDLORD_NAV_TO} className={mobileDrawerRowClass} onClick={closeMobileNav}>
                  For landlords
                </Link>
                <Link to="/for-universities" className={mobileDrawerRowClass} onClick={closeMobileNav}>
                  Universities
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <Link
                  to="/landlords/ai"
                  className={`${mobileDrawerRowClass} gap-2 font-medium text-[#FF6F61]`}
                  onClick={closeMobileNav}
                >
                  <AiSparkleIcon className="h-5 w-5 shrink-0" />
                  Landlord AI
                </Link>
                {role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`${mobileDrawerRowClass} font-medium text-indigo-600`}
                    onClick={closeMobileNav}
                  >
                    Admin dashboard
                  </Link>
                )}
                <div className="border-t border-gray-100 my-2" />
                <div className="space-y-1 px-0 pb-2">
                  {user ? (
                    <>
                      {showMessagesNav && (
                        <Link
                          to="/messages"
                          className={`${mobileDrawerRowClass} gap-2 font-medium text-gray-900`}
                          onClick={closeMobileNav}
                        >
                          Messages
                          {unreadMessageCount > 0 && (
                            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#FF6F61] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                            </span>
                          )}
                        </Link>
                      )}
                      {showDashboardInAuth && (
                        <Link
                          to={dashboardHref}
                          className={`${mobileDrawerRowClass} font-medium text-gray-900`}
                          onClick={closeMobileNav}
                        >
                          Dashboard
                        </Link>
                      )}
                      {needsOnboarding(role, profile, user.id) ? (
                        <Link
                          to={finishSetupHref(role)}
                          className={`${mobileDrawerRowClass} text-amber-700`}
                          onClick={closeMobileNav}
                        >
                          Finish setup
                        </Link>
                      ) : role !== 'admin' ? (
                        <Link
                          to={profileHref}
                          className={`${mobileDrawerRowClass} text-gray-600`}
                          onClick={closeMobileNav}
                        >
                          Profile
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className={`${mobileDrawerRowClass} w-full text-left text-red-600`}
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link to="/login" className={`${mobileDrawerRowClass} text-gray-600`} onClick={closeMobileNav}>
                      Log in
                    </Link>
                  )}
                </div>
                <div className="border-t border-gray-100 my-2" />
                <Link to="/about" className={`${mobileDrawerRowClass} gap-3 text-gray-700`} onClick={closeMobileNav}>
                  <Info className="h-5 w-5 shrink-0 text-[#1B2A4A]/70" aria-hidden />
                  About
                </Link>
                <Link to="/contact" className={`${mobileDrawerRowClass} gap-3 text-gray-700`} onClick={closeMobileNav}>
                  <Mail className="h-5 w-5 shrink-0 text-[#1B2A4A]/70" aria-hidden />
                  Contact
                </Link>
                <div className="px-4 pt-3 pb-4">
                  <SiteSocialLinks variant="drawer" />
                </div>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
