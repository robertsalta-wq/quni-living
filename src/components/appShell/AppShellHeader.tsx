import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, ChevronLeft } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import {
  appShellFocusFallbackPath,
  appShellFocusTitle,
  isAppShellFocusPath,
  isLandlordDesktopAppChrome,
  isListingEditDesktopSectionChrome,
  isListingEditHubChromePath,
} from '../../lib/appShell'
import { getAppShellScrollElement } from '../../lib/appShellScroll'
import {
  dashboardMobileHomePath,
  dashboardMobileSectionTitle,
  dashboardShellActiveSection,
} from '../../lib/dashboardMobileChrome'
import { isRenterRole, type LandlordProfileRow } from '../../lib/authProfile'
import { formatDisplayName } from '../../lib/formatDisplayName'
import { landlordDisplayName } from '../../lib/nameResolution'
import { canLandlordCreateListing } from '../../lib/onboardingChecklist'
import {
  landlordBookingsPath,
  landlordDashboardTabPath,
  userDashboardProfilePath,
} from '../../lib/userDashboardNav'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'

type Props = {
  /** Optional trailing actions (desktop account already in marketing; keep light). */
  trailing?: ReactNode
}

const HIDE_THRESHOLD_PX = 12

function landlordDesktopTabClass(active: boolean): string {
  return [
    'qtab inline-flex items-center gap-1.5 px-1.5 text-sm cursor-pointer border-b-2 transition-colors',
    active
      ? 'font-semibold text-[var(--quni-coral-active)] border-[var(--quni-coral)] -mb-px'
      : 'font-medium text-[var(--quni-ink-4)] border-transparent hover:text-[var(--quni-coral-active)]',
  ].join(' ')
}

/**
 * Slim app-shell top bar (chrome routes only). Condenses / hides on scroll-down
 * inside the shell scroller; returns on scroll-up. Not used on marketing pages.
 */
export default function AppShellHeader({ trailing }: Props) {
  const { role, user, profile, signOut } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const focusPath = isAppShellFocusPath(location.pathname)
  const isMobile = useIsMobile()
  const listingHubChrome = isListingEditHubChromePath(location.pathname, isMobile)
  const listingDesktopSection = isListingEditDesktopSectionChrome(location.pathname, isMobile)
  const landlordDesktopChrome = isLandlordDesktopAppChrome(role, location.pathname, isMobile)
  /** Desktop listing edit uses standard Quni section header, not focus back-bar. */
  const focus = focusPath && !listingDesktopSection
  const title =
    dashboardMobileSectionTitle(role, location.pathname, location.search) ??
    (focusPath ? appShellFocusTitle(location.pathname) : 'Dashboard')
  const homeHref = dashboardMobileHomePath(role)
  const profileHref =
    role === 'landlord' || isRenterRole(role)
      ? userDashboardProfilePath(role === 'landlord' ? 'landlord' : 'renter')
      : homeHref

  const unreadMessageCount = useUnreadMessageCount(
    landlordDesktopChrome || listingHubChrome ? user?.id : undefined,
  )
  const activeSection = dashboardShellActiveSection(role, location.pathname, location.search)

  const [hidden, setHidden] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    if (listingHubChrome || landlordDesktopChrome) {
      setHidden(false)
      return
    }
    const main = getAppShellScrollElement()
    if (!main) return

    lastScrollRef.current = main.scrollTop

    const onScroll = () => {
      const y = main.scrollTop
      const prev = lastScrollRef.current
      const delta = y - prev
      lastScrollRef.current = y

      if (y < 24) {
        setHidden(false)
        return
      }
      if (delta > HIDE_THRESHOLD_PX) setHidden(true)
      else if (delta < -HIDE_THRESHOLD_PX) setHidden(false)
    }

    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [location.pathname, location.search, listingHubChrome, landlordDesktopChrome])

  useEffect(() => {
    if (!accountMenuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountMenuOpen])

  function onFocusBack() {
    const state = location.state as { returnTo?: string } | null
    const returnTo = typeof state?.returnTo === 'string' && state.returnTo.trim() ? state.returnTo : null
    if (returnTo) {
      navigate(returnTo)
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(appShellFocusFallbackPath(role, location.pathname))
  }

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

  const accountFirstName = displayName.split(/\s+/)[0] || 'Account'

  /** Desktop landlord chrome: initials from display name. */
  const desktopInitials = (() => {
    const parts = displayName.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
    }
    if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase()
    return 'Me'
  })()

  /** Mobile / listing-hub: email-based initials (unchanged). */
  const initials = (() => {
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

  if (landlordDesktopChrome) {
    return (
      <header
        className="sticky top-0 z-50 w-full max-w-full shrink-0 border-b border-[var(--quni-cream-border)] bg-[var(--quni-cream)]"
        data-app-shell-header="landlord-desktop"
      >
        <div className="mx-auto flex h-16 max-w-site items-center gap-7 px-8">
          <Link
            to="/landlord/dashboard"
            className="inline-flex shrink-0 items-baseline gap-1.5 font-display text-2xl font-bold leading-none tracking-[-0.02em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            aria-label="Quni Dashboard"
          >
            <span className="text-[var(--quni-coral)]">Quni</span>
            <span className="text-[var(--quni-ink)]">Dashboard</span>
          </Link>

          <nav
            className="ml-3.5 flex flex-1 items-stretch gap-1.5 self-stretch"
            aria-label="Dashboard sections"
          >
            <button
              type="button"
              onClick={() => goLandlordSection('overview')}
              className={landlordDesktopTabClass(activeSection === 'overview')}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => goLandlordSection('listings')}
              className={landlordDesktopTabClass(activeSection === 'listings')}
            >
              Listings
            </button>
            <Link to="/messages" className={landlordDesktopTabClass(activeSection === 'messages')}>
              Messages
              {unreadMessageCount > 0 ? (
                <span className="rounded-full bg-[var(--quni-coral)] px-1.5 py-px text-[10px] font-bold leading-[1.4] text-white tabular-nums">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              ) : null}
            </Link>
            <Link
              to={landlordBookingsPath()}
              className={landlordDesktopTabClass(activeSection === 'bookings')}
            >
              Bookings
            </Link>
            <button
              type="button"
              onClick={() => goLandlordSection('profile')}
              className={landlordDesktopTabClass(activeSection === 'profile')}
            >
              Profile
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-[18px]">
            <Link
              to={addListingHref}
              className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--quni-coral)] px-[15px] py-[9px] text-[13.5px] font-semibold text-white transition-colors duration-200 ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              + Add new listing
            </Link>
            <Link
              to="/messages"
              className="relative inline-flex text-[var(--quni-ink-4)] hover:text-[var(--quni-coral-active)]"
              aria-label={
                unreadMessageCount > 0
                  ? `Messages, ${unreadMessageCount} unread`
                  : 'Messages'
              }
            >
              <Bell className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden />
              {unreadMessageCount > 0 ? (
                <span
                  className="absolute -right-[3px] -top-[3px] h-2 w-2 rounded-full border-[1.5px] border-[var(--quni-cream)] bg-[var(--quni-coral)]"
                  aria-hidden
                />
              ) : null}
            </Link>
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                className="inline-flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--quni-cream-border)] bg-white font-display text-[13px] font-bold text-[var(--quni-coral-active)]">
                  {desktopInitials}
                </span>
                <span className="text-[13.5px] font-semibold text-[var(--quni-ink)]">{accountFirstName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--quni-ink-4)]" aria-hidden />
              </button>
              {accountMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[60] mt-2 w-44 overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-[var(--shadow-3)]"
                >
                  <Link
                    to={profileHref}
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-[var(--quni-ink-2)] hover:bg-[var(--quni-surface-2)]"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-2 text-left text-sm text-[var(--quni-danger)] hover:bg-[var(--quni-surface-2)]"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      void signOut()
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>
    )
  }

  if (listingHubChrome) {
    return (
      <header
        className="z-50 w-full max-w-full shrink-0 overflow-x-clip overflow-y-hidden border-b border-[var(--quni-cream-border)] bg-[var(--quni-cream)] pt-safe-top"
        data-app-shell-header="listing-hub"
      >
        <div className="mx-auto flex h-12 max-w-site items-center justify-between gap-2 px-3 sm:h-14 sm:px-6 lg:px-8">
          <Link
            to="/landlord/dashboard"
            className="inline-flex min-w-0 items-baseline gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            aria-label="Quni Dashboard"
          >
            <span className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--quni-coral)]">
              Quni
            </span>
            <span className="text-[19px] font-bold leading-none tracking-[-0.01em] text-[var(--quni-navy)]">
              Dashboard
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            {trailing}
            {user ? (
              <Link
                to={profileHref}
                className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--quni-cream-border)] bg-white font-display text-[13px] font-bold text-[var(--quni-coral-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                aria-label="Profile"
              >
                {initials}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className={[
        'z-50 w-full max-w-full shrink-0 overflow-x-clip overflow-y-hidden border-b border-[#E8E0CC] bg-white pt-safe-top',
        'transition-transform duration-200 ease-out will-change-transform',
        hidden ? 'max-sm:-translate-y-full max-sm:pointer-events-none' : 'translate-y-0',
      ].join(' ')}
      data-app-shell-header={hidden ? 'condensed' : 'expanded'}
    >
      <div className="mx-auto flex h-12 max-w-site items-center gap-2 px-3 sm:h-14 sm:px-6 lg:px-8">
        {focus ? (
          <button
            type="button"
            onClick={onFocusBack}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[#1F2A44] hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <Link
            to={homeHref}
            className="inline-flex min-w-0 items-center gap-1.5 font-display text-[20px] font-bold leading-none tracking-[-0.02em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61] sm:text-[22px]"
            aria-label={`Quni ${title}`}
          >
            <span className="text-[#FF6F61]">Quni</span>
            <span className="truncate text-[#1F2A44] sm:hidden">{title}</span>
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {focus ? (
            <p className="truncate text-sm font-semibold text-[#08060D] sm:text-base">{title}</p>
          ) : (
            <p className="hidden truncate text-sm font-semibold text-[#08060D] sm:block sm:text-base">
              {title}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {trailing}
          {user ? (
            <Link
              to={profileHref}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6F61]"
              aria-label="Profile"
            >
              Me
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
