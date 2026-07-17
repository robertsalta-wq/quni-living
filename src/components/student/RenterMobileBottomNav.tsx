import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, LayoutGrid, MessageSquare, User } from 'lucide-react'
import { useAuthContext } from '../../context/AuthContext'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'
import { renterMobileActiveSection } from '../../lib/renterMobileChrome'
import { prefetchDashboardMobileTabChunks, prefetchRouteChunks } from '../../lib/routePrefetch'
import { studentDashboardTabPath } from '../../lib/userDashboardNav'

const items = [
  { id: 'overview' as const, label: 'Overview', to: studentDashboardTabPath('overview'), Icon: LayoutGrid },
  { id: 'bookings' as const, label: 'Bookings', to: studentDashboardTabPath('bookings'), Icon: CalendarDays },
  { id: 'messages' as const, label: 'Messages', to: '/messages', Icon: MessageSquare },
  { id: 'profile' as const, label: 'Profile', to: '/student-profile', Icon: User },
]

function itemClass(active: boolean): string {
  return [
    'relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 select-none touch-manipulation [-webkit-touch-callout:none]',
    active ? 'text-[#FF6F61]' : 'text-[#6B6375]',
  ].join(' ')
}

function labelClass(active: boolean): string {
  return ['text-[10.5px] leading-none', active ? 'font-semibold' : 'font-medium'].join(' ')
}

/** Bottom tab bar for renter dashboard chrome below `sm`. Render once from App. */
export default function RenterMobileBottomNav() {
  const location = useLocation()
  const { user } = useAuthContext()
  const unreadMessageCount = useUnreadMessageCount(user?.id)
  const active = renterMobileActiveSection(location.pathname, location.search)

  // Warm every tab destination (Messages + Profile are cross-chunk hops).
  useEffect(() => {
    prefetchDashboardMobileTabChunks('renter')
  }, [])

  return (
    <nav
      className="shrink-0 border-t border-[#E8E0CC] bg-white px-2 pt-2 sm:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Dashboard sections"
    >
      <div className="flex w-full items-stretch justify-between gap-0">
        {items.map(({ id, label, to, Icon }) => {
          const isActive = active === id
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
      </div>
    </nav>
  )
}
