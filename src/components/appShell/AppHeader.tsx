import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ChevronLeft } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import {
  appChromeHeaderInner,
  appShellActiveSection,
  appShellBackDestination,
  appShellFocusFallbackPath,
  appShellFocusTitle,
} from '../../lib/appShell'
import { dashboardMobileHomePath } from '../../lib/dashboardMobileChrome'
import { isRenterRole, type LandlordProfileRow } from '../../lib/authProfile'
import { formatDisplayName } from '../../lib/formatDisplayName'
import { landlordDisplayName } from '../../lib/nameResolution'
import { canLandlordCreateListing } from '../../lib/onboardingChecklist'
import {
  landlordBookingsPath,
  landlordDashboardTabPath,
  studentDashboardTabPath,
  userDashboardProfilePath,
} from '../../lib/userDashboardNav'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'
import ChromeHeaderShell from '../ChromeHeaderShell'
import { QuniLogoHomeLink, quniDashboardLabelClassName } from '../SiteBrandLockup'

/** Match marketing Header main nav: text-sm + same gap scale. */
function desktopTabClass(active: boolean): string {
  return [
    'inline-flex items-center gap-1.5 whitespace-nowrap text-sm border-b-2 transition-colors cursor-pointer',
    active
      ? 'font-semibold text-[var(--quni-coral-active)] border-[var(--quni-coral)]'
      : 'font-medium text-gray-600 border-transparent hover:text-gray-900',
  ].join(' ')
}

type AccountMenuProps = {
  displayName: string
  initials: string
  profileHref: string
  onSignOut: () => void
}

function DesktopAccountMenu({ displayName, initials, profileHref, onSignOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const firstName = displayName.split(/\s+/)[0] || 'Account'

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--quni-cream-border)] bg-white font-display text-[13px] font-bold text-[var(--quni-coral-active)]">
          {initials}
        </span>
        <span className="text-[13.5px] font-semibold text-[var(--quni-ink)]">{firstName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--quni-ink-4)]" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] mt-2 w-44 overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-[var(--shadow-3)]"
        >
          <Link
            to={profileHref}
            role="menuitem"
            className="block px-4 py-2 text-sm text-[var(--quni-ink-2)] hover:bg-[var(--quni-surface-2)]"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-4 py-2 text-left text-sm text-[var(--quni-danger)] hover:bg-[var(--quni-surface-2)]"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * App dashboard header — geometry from ChromeHeaderShell (marketing reference).
 * Landlords always get dashboard-inner (brand + Dashboard). Bar contents are
 * decided separately by AppActionBar.
 */
export default function AppHeader() {
  const { role, user, profile, signOut } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const headerInner = appChromeHeaderInner(location.pathname, role, isMobile)

  const unreadMessageCount = useUnreadMessageCount(
    headerInner === 'dashboard' && !isMobile ? user?.id : undefined,
  )
  const activeSection = appShellActiveSection(role, location.pathname, location.search)

  const dashboardHomeHref = dashboardMobileHomePath(role)
  const profileHref =
    role === 'landlord' || isRenterRole(role)
      ? userDashboardProfilePath(role === 'landlord' ? 'landlord' : 'renter')
      : dashboardHomeHref

  const landlordProfile = role === 'landlord' ? (profile as LandlordProfileRow | null) : null

  const displayName = (() => {
    if (landlordProfile) {
      const name = formatDisplayName(landlordDisplayName(landlordProfile, ''))
      if (name) return name
    }
    const email = user?.email?.trim() || ''
    if (!email) return 'Account'
    return email.split('@')[0] || 'Account'
  })()

  const desktopInitials = (() => {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
    if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase()
    return 'Me'
  })()

  const mobileInitials = (() => {
    const email = user?.email?.trim() || ''
    if (!email) return 'Me'
    const local = email.split('@')[0] || 'Me'
    const parts = local.split(/[._-]+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
    return local.slice(0, 2).toUpperCase()
  })()

  const addListingHref =
    landlordProfile && canLandlordCreateListing(landlordProfile)
      ? '/landlord/property/new'
      : landlordDashboardTabPath('profile')

  function goLandlordSection(section: 'overview' | 'listings' | 'bookings' | 'profile') {
    if (section === 'bookings') {
      navigate(landlordBookingsPath())
      return
    }
    navigate(landlordDashboardTabPath(section))
  }

  function goRenterSection(section: 'overview' | 'bookings' | 'saved' | 'profile') {
    if (section === 'profile') {
      navigate('/student-profile')
      return
    }
    if (section === 'overview') {
      navigate(studentDashboardTabPath('overview'))
      return
    }
    navigate(studentDashboardTabPath(section))
  }

  /** Fixed-URL exit only — never browser history back. */
  function onBack() {
    const state = location.state as { returnTo?: string } | null
    const returnTo = typeof state?.returnTo === 'string' && state.returnTo.trim() ? state.returnTo : null
    if (returnTo) {
      navigate(returnTo)
      return
    }
    navigate(appShellFocusFallbackPath(role, location.pathname))
  }

  if (headerInner == null) return null

  if (headerInner === 'task') {
    const title = appShellFocusTitle(location.pathname)
    const destination = appShellBackDestination(location.pathname)
    return (
      <ChromeHeaderShell data-chrome-header="task">
        <div className="flex w-full max-w-full items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[#1F2A44] hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
            aria-label={`Back to ${destination}`}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
            <span className="text-sm font-semibold sm:text-base">{destination}</span>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[#08060D] sm:text-base">
            {title}
          </p>
          {user ? (
            <Link
              to={profileHref}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-[var(--quni-cream-border)] bg-white text-xs font-semibold text-[var(--quni-coral-active)] hover:bg-[var(--quni-surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
              aria-label="Profile"
            >
              {mobileInitials}
            </Link>
          ) : (
            <span className="min-w-11 shrink-0" aria-hidden />
          )}
        </div>
      </ChromeHeaderShell>
    )
  }

  // dashboard inner
  if (!isMobile && role === 'landlord') {
    return (
      <ChromeHeaderShell data-chrome-header="dashboard-desktop-landlord">
        <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 md:gap-4">
          <div className="min-w-0 shrink-0">
            <div className="inline-flex min-w-0 items-center gap-2">
              <QuniLogoHomeLink />
              <span className={quniDashboardLabelClassName}>Dashboard</span>
            </div>
          </div>
          <div className="-my-4 flex min-w-0 items-stretch justify-center self-stretch">
            <nav
              className="flex min-w-0 items-stretch justify-center gap-3 overflow-x-hidden lg:gap-4 xl:gap-5"
              aria-label="Dashboard sections"
            >
              <button type="button" onClick={() => goLandlordSection('overview')} className={desktopTabClass(activeSection === 'overview')}>
                Overview
              </button>
              <button type="button" onClick={() => goLandlordSection('listings')} className={desktopTabClass(activeSection === 'listings')}>
                Listings
              </button>
              <Link to="/messages" className={desktopTabClass(activeSection === 'messages')}>
                Messages
                {unreadMessageCount > 0 ? (
                  <span className="rounded-full bg-[var(--quni-coral)] px-1.5 py-px text-[10px] font-bold leading-[1.4] text-white tabular-nums">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                ) : null}
              </Link>
              <Link to={landlordBookingsPath()} className={desktopTabClass(activeSection === 'bookings')}>
                Bookings
              </Link>
              <button type="button" onClick={() => goLandlordSection('profile')} className={desktopTabClass(activeSection === 'profile')}>
                Profile
              </button>
            </nav>
          </div>
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <Link
              to={addListingHref}
              className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--quni-coral)] px-[15px] py-[9px] text-[13.5px] font-semibold text-white transition-colors duration-200 ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              + Add new listing
            </Link>
            <Link
              to="/messages"
              className="relative inline-flex text-[var(--quni-ink-4)] hover:text-[var(--quni-coral-active)]"
              aria-label={unreadMessageCount > 0 ? `Messages, ${unreadMessageCount} unread` : 'Messages'}
            >
              <Bell className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden />
              {unreadMessageCount > 0 ? (
                <span
                  className="absolute -right-[3px] -top-[3px] h-2 w-2 rounded-full border-[1.5px] border-[var(--quni-cream)] bg-[var(--quni-coral)]"
                  aria-hidden
                />
              ) : null}
            </Link>
            <DesktopAccountMenu
              displayName={displayName}
              initials={desktopInitials}
              profileHref={profileHref}
              onSignOut={() => void signOut()}
            />
          </div>
        </div>
      </ChromeHeaderShell>
    )
  }

  if (!isMobile && isRenterRole(role)) {
    return (
      <ChromeHeaderShell data-chrome-header="dashboard-desktop-renter">
        <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 md:gap-4">
          <div className="min-w-0 shrink-0">
            <div className="inline-flex min-w-0 items-center gap-2">
              <QuniLogoHomeLink />
              <span className={quniDashboardLabelClassName}>Dashboard</span>
            </div>
          </div>
          <div className="-my-4 flex min-w-0 items-stretch justify-center self-stretch">
            <nav
              className="flex min-w-0 items-stretch justify-center gap-3 overflow-x-hidden lg:gap-4 xl:gap-5"
              aria-label="Dashboard sections"
            >
              <button type="button" onClick={() => goRenterSection('overview')} className={desktopTabClass(activeSection === 'overview')}>
                Overview
              </button>
              <button type="button" onClick={() => goRenterSection('bookings')} className={desktopTabClass(activeSection === 'bookings')}>
                Bookings
              </button>
              <button type="button" onClick={() => goRenterSection('saved')} className={desktopTabClass(activeSection === 'saved')}>
                Saved
              </button>
              <Link to="/messages" className={desktopTabClass(activeSection === 'messages')}>
                Messages
                {unreadMessageCount > 0 ? (
                  <span className="rounded-full bg-[var(--quni-coral)] px-1.5 py-px text-[10px] font-bold leading-[1.4] text-white tabular-nums">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                ) : null}
              </Link>
              <button type="button" onClick={() => goRenterSection('profile')} className={desktopTabClass(activeSection === 'profile')}>
                Profile
              </button>
            </nav>
          </div>
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <DesktopAccountMenu
              displayName={displayName}
              initials={desktopInitials}
              profileHref={profileHref}
              onSignOut={() => void signOut()}
            />
          </div>
        </div>
      </ChromeHeaderShell>
    )
  }

  if (!isMobile) {
    return (
      <ChromeHeaderShell data-chrome-header="dashboard-desktop">
        <div className="flex w-full max-w-full items-center justify-between gap-3">
          <div className="min-w-0 shrink-0">
            <div className="inline-flex min-w-0 items-center gap-2">
              <QuniLogoHomeLink />
              <span className={quniDashboardLabelClassName}>Dashboard</span>
            </div>
          </div>
          {user ? (
            <DesktopAccountMenu
              displayName={displayName}
              initials={desktopInitials}
              profileHref={profileHref}
              onSignOut={() => void signOut()}
            />
          ) : null}
        </div>
      </ChromeHeaderShell>
    )
  }

  return (
    <ChromeHeaderShell data-chrome-header="dashboard-mobile">
      {/* Same 3-column grid as marketing Header so the logo sits in the same left cell. */}
      <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 md:gap-4">
        <div className="min-w-0 shrink-0">
          <div className="inline-flex min-w-0 items-center gap-2">
            <QuniLogoHomeLink />
            <span className={quniDashboardLabelClassName}>Dashboard</span>
          </div>
        </div>
        <div className="min-w-0" aria-hidden />
        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <Link
              to={profileHref}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--quni-cream-border)] bg-white font-display text-[13px] font-bold text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
              aria-label="Profile"
            >
              {mobileInitials}
            </Link>
          ) : null}
        </div>
      </div>
    </ChromeHeaderShell>
  )
}
