import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import {
  landlordBookingsPath,
  landlordDashboardTabPath,
  studentDashboardTabPath,
  userDashboardProfilePath,
} from '../../lib/userDashboardNav'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'
import AccountAvatar, {
  ACCOUNT_AVATAR_FRAME_CLASS,
  ACCOUNT_MENU_CHEVRON_CLASS,
  ACCOUNT_MENU_NAME_CLASS,
  ACCOUNT_MENU_TRIGGER_CLASS,
} from '../AccountAvatar'
import ChromeHeaderShell from '../ChromeHeaderShell'
import { DashboardBrandLockup } from '../SiteBrandLockup'

/** Match marketing Header account menu width (w-52). */
const ACCOUNT_MENU_WIDTH_PX = 208

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
  photoUrl: string | null
  profileHref: string
  onSignOut: () => void
  /** Avatar-only trigger (mobile / task headers). Desktop shows name + chevron. */
  compact?: boolean
}

/**
 * Shared account menu: Profile + Sign out.
 * Portaled to document.body — ChromeHeaderShell clips overflow (overflow-y-hidden),
 * so an in-header absolute panel is invisible.
 */
function AccountMenu({
  displayName,
  initials,
  photoUrl,
  profileHref,
  onSignOut,
  compact = false,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstName = displayName.split(/\s+/)[0] || 'Account'

  function syncAnchor() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setAnchor(rect)
  }

  function close() {
    setOpen(false)
    setAnchor(null)
  }

  function toggle() {
    if (open) {
      close()
      return
    }
    syncAnchor()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    syncAnchor()
    function onLayout() {
      syncAnchor()
    }
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      const t = e.target as Node
      if (buttonRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      close()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointer)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={
          compact
            ? `${ACCOUNT_AVATAR_FRAME_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]`
            : ACCOUNT_MENU_TRIGGER_CLASS
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {compact ? (
          <AccountAvatar photoUrl={photoUrl} initials={initials} />
        ) : (
          <>
            <span className={ACCOUNT_AVATAR_FRAME_CLASS}>
              <AccountAvatar photoUrl={photoUrl} initials={initials} />
            </span>
            <span className={ACCOUNT_MENU_NAME_CLASS}>{firstName}</span>
            <ChevronDown className={ACCOUNT_MENU_CHEVRON_CLASS} aria-hidden />
          </>
        )}
      </button>
      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            className="fixed z-[200] w-52 overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-[var(--shadow-3)]"
            style={{
              top: anchor.bottom + 8,
              left: Math.max(8, anchor.right - ACCOUNT_MENU_WIDTH_PX),
            }}
          >
            <Link
              to={profileHref}
              role="menuitem"
              className="block px-4 py-2 text-sm text-[var(--quni-ink-2)] hover:bg-[var(--quni-surface-2)]"
              onClick={close}
            >
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-sm text-[var(--quni-danger)] hover:bg-[var(--quni-surface-2)]"
              onClick={() => {
                close()
                onSignOut()
              }}
            >
              Sign out
            </button>
          </div>,
          document.body,
        )}
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

  /** Same source as marketing Header — initials only when no photo. */
  const profilePhotoUrl = profile?.avatar_url?.trim() || null

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
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[var(--quni-navy)] hover:bg-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            aria-label={`Back to ${destination}`}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
            <span className="text-sm font-semibold sm:text-base">{destination}</span>
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--quni-ink)] sm:text-base">
            {title}
          </p>
          {user ? (
            <AccountMenu
              compact
              displayName={displayName}
              initials={mobileInitials}
              photoUrl={profilePhotoUrl}
              profileHref={profileHref}
              onSignOut={() => void signOut()}
            />
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
          <DashboardBrandLockup />
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
            <AccountMenu
              displayName={displayName}
              initials={desktopInitials}
              photoUrl={profilePhotoUrl}
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
          <DashboardBrandLockup />
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
            <AccountMenu
              displayName={displayName}
              initials={desktopInitials}
              photoUrl={profilePhotoUrl}
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
          <DashboardBrandLockup />
          {user ? (
            <AccountMenu
              displayName={displayName}
              initials={desktopInitials}
              photoUrl={profilePhotoUrl}
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
      {/* Same 3-column grid as marketing; brand lockup locks logo box to h-9 like marketing. */}
      <div className="grid w-full max-w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 md:gap-4">
        <DashboardBrandLockup />
        <div className="min-w-0" aria-hidden />
        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {user ? (
            <AccountMenu
              compact
              displayName={displayName}
              initials={mobileInitials}
              photoUrl={profilePhotoUrl}
              profileHref={profileHref}
              onSignOut={() => void signOut()}
            />
          ) : null}
        </div>
      </div>
    </ChromeHeaderShell>
  )
}
