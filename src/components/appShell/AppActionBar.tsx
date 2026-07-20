import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building2, CalendarDays, Heart, LayoutGrid, MessageSquare, User, type LucideIcon } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useOpenAiChat } from '../../context/AiChatOpenContext'
import { isRenterRole } from '../../lib/authProfile'
import { appChromeBarContents } from '../../lib/appShell'
import { LANDLORD_NAV_BAR_ITEMS, RENTER_NAV_BAR_ITEMS } from '../../lib/appChromeBarItems'
import { landlordMobileActiveSection } from '../../lib/landlordMobileChrome'
import { renterMobileActiveSection } from '../../lib/renterMobileChrome'
import { prefetchDashboardMobileTabChunks, prefetchRouteChunks } from '../../lib/routePrefetch'
import { landlordBookingsPath, landlordDashboardTabPath, studentDashboardTabPath } from '../../lib/userDashboardNav'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'
import { ASK_AI_BUTTON_LABEL } from '../aiChat/chatAiLabels'
import AiSparkleIcon from '../AiSparkleIcon'
import { useAppChromeActions, type AppActionBarItem } from './AppChromeActionsContext'

const NAV_ICONS: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  listings: Building2,
  messages: MessageSquare,
  bookings: CalendarDays,
  saved: Heart,
  profile: User,
}

const LANDLORD_NAV_TO: Record<string, string> = {
  overview: landlordDashboardTabPath('overview'),
  listings: landlordDashboardTabPath('listings'),
  messages: '/messages',
  bookings: landlordBookingsPath(),
  profile: landlordDashboardTabPath('profile'),
}

const RENTER_NAV_TO: Record<string, string> = {
  overview: studentDashboardTabPath('overview'),
  bookings: studentDashboardTabPath('bookings'),
  saved: studentDashboardTabPath('saved'),
  messages: '/messages',
  profile: '/student-profile',
}

/** Invariant styling — copied from the real nav (do not invent), §1b. */
function itemClass(coral: boolean): string {
  return [
    'relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 select-none touch-manipulation [-webkit-touch-callout:none]',
    coral ? 'text-[#FF6F61]' : 'text-[#6B6375]',
  ].join(' ')
}

function labelClass(coral: boolean): string {
  return ['text-[10.5px] leading-none', coral ? 'font-semibold' : 'font-medium'].join(' ')
}

const barContainerClass =
  'shrink-0 border-t border-[var(--brand-header-border)] bg-white px-2 pt-2 sm:hidden'
const barContainerStyle = { paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }

/**
 * Permanent trailing Ask AI control — coral chip + label on every surface.
 * Same flex-1 / 44px target as nav items; no divider, label never hidden.
 */
function AskAiBarItem() {
  const openChat = useOpenAiChat()
  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={ASK_AI_BUTTON_LABEL}
      className="relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 select-none touch-manipulation text-[var(--quni-coral)] [-webkit-touch-callout:none]"
    >
      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--quni-coral)] text-white">
        <AiSparkleIcon className="h-3.5 w-3.5 shrink-0" />
      </span>
      <span className="text-[10.5px] font-semibold leading-none">{ASK_AI_BUTTON_LABEL}</span>
    </button>
  )
}

function NavBar({ role }: { role: 'landlord' | 'renter' }) {
  const location = useLocation()
  const { user } = useAuthContext()
  const unreadMessageCount = useUnreadMessageCount(user?.id)
  const items = role === 'landlord' ? LANDLORD_NAV_BAR_ITEMS : RENTER_NAV_BAR_ITEMS
  const toFor = role === 'landlord' ? LANDLORD_NAV_TO : RENTER_NAV_TO
  const active =
    role === 'landlord'
      ? landlordMobileActiveSection(location.pathname, location.search)
      : renterMobileActiveSection(location.pathname, location.search)

  useEffect(() => {
    prefetchDashboardMobileTabChunks(role)
  }, [role])

  return (
    <nav className={barContainerClass} style={barContainerStyle} aria-label="Dashboard sections">
      <div className="flex w-full items-stretch justify-between gap-0">
        {items.map(({ id, label }) => {
          const isActive = active === id
          const to = toFor[id]!
          const Icon = NAV_ICONS[id]!
          const showBadge = id === 'messages' && unreadMessageCount > 0
          return (
            <Link
              key={id}
              to={to}
              className={itemClass(isActive)}
              aria-current={isActive ? 'page' : undefined}
              draggable={false}
              onPointerDown={() => prefetchRouteChunks(to)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="relative inline-flex">
                <Icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.25 : 1.9} aria-hidden />
                {showBadge ? (
                  <span className="absolute -right-2 -top-1 inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#FF6F61] px-1 text-[9px] font-bold leading-none text-white tabular-nums">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                ) : null}
              </span>
              <span className={labelClass(isActive)}>{label}</span>
            </Link>
          )
        })}
        <AskAiBarItem />
      </div>
    </nav>
  )
}

function ActionBarItemContent({ item }: { item: AppActionBarItem }) {
  const coral = Boolean(item.active || item.primary)
  const Icon = item.icon
  return (
    <>
      {Icon ? <Icon className="h-[22px] w-[22px]" strokeWidth={coral ? 2.25 : 1.9} aria-hidden /> : null}
      <span className={labelClass(coral)}>{item.label}</span>
    </>
  )
}

/** Action mode — page-scoped items + permanent Ask AI trailing chip (§1b). */
function ActionBar({ items }: { items: AppActionBarItem[] }) {
  return (
    <nav className={barContainerClass} style={barContainerStyle} aria-label="Page actions">
      <div className="flex w-full items-stretch justify-between gap-0">
        {items.map((item) => {
          const coral = Boolean(item.active || item.primary)
          if (item.to && !item.disabled) {
            return (
              <Link key={item.id} to={item.to} className={itemClass(coral)} draggable={false}>
                <ActionBarItemContent item={item} />
              </Link>
            )
          }
          // Indicator-only (e.g. hub "Health" current view) — not a dead button.
          if (!item.onClick && !item.to) {
            return (
              <span key={item.id} className={itemClass(coral)} aria-current={item.active ? 'page' : undefined}>
                <ActionBarItemContent item={item} />
              </span>
            )
          }
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={item.onClick}
              className={`${itemClass(coral)} disabled:opacity-45`}
            >
              <ActionBarItemContent item={item} />
            </button>
          )
        })}
        <AskAiBarItem />
      </div>
    </nav>
  )
}

/**
 * One bottom bar (mobile only). Contents from appChromeBarContents — independent
 * of the header. Browse → nav; listing edit → page-actions from context.
 * Ask AI is chrome — always appended by this shell, never by pages.
 */
export default function AppActionBar() {
  const { role } = useAuthContext()
  const location = useLocation()
  const isMobile = useIsMobile()
  const actionItems = useAppChromeActions()
  const bar = appChromeBarContents(location.pathname, role, isMobile)

  if (bar === 'none') return null
  if (bar === 'page-actions') return <ActionBar items={actionItems} />

  if (role === 'landlord') return <NavBar role="landlord" />
  if (isRenterRole(role)) return <NavBar role="renter" />
  return null
}
