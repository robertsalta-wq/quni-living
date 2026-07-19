import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import {
  appShellFocusFallbackPath,
  appShellFocusTitle,
  isAppShellFocusPath,
  isListingEditDesktopSectionChrome,
  isListingEditHubChromePath,
} from '../../lib/appShell'
import { getAppShellScrollElement } from '../../lib/appShellScroll'
import {
  dashboardMobileHomePath,
  dashboardMobileSectionTitle,
} from '../../lib/dashboardMobileChrome'
import { isRenterRole } from '../../lib/authProfile'
import { userDashboardProfilePath } from '../../lib/userDashboardNav'
import { useIsMobile } from '../../hooks/useIsMobile'

type Props = {
  /** Optional trailing actions (desktop account already in marketing; keep light). */
  trailing?: ReactNode
}

const HIDE_THRESHOLD_PX = 12

/**
 * Slim app-shell top bar (chrome routes only). Condenses / hides on scroll-down
 * inside the shell scroller; returns on scroll-up. Not used on marketing pages.
 */
export default function AppShellHeader({ trailing }: Props) {
  const { role, user } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const focusPath = isAppShellFocusPath(location.pathname)
  const isMobile = useIsMobile()
  const listingHubChrome = isListingEditHubChromePath(location.pathname, isMobile)
  const listingDesktopSection = isListingEditDesktopSectionChrome(location.pathname, isMobile)
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

  const [hidden, setHidden] = useState(false)
  const lastScrollRef = useRef(0)

  useEffect(() => {
    if (listingHubChrome) {
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
  }, [location.pathname, location.search, listingHubChrome])

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

  const initials = (() => {
    const email = user?.email?.trim() || ''
    if (!email) return 'Me'
    const local = email.split('@')[0] || 'Me'
    const parts = local.split(/[._-]+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
    return local.slice(0, 2).toUpperCase()
  })()

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
