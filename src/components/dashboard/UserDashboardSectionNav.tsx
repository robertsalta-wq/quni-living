import { Link } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import type { UserDashboardSection } from '../../lib/userDashboardNav'
import { landlordBookingsPath } from '../../lib/userDashboardNav'
import { useUnreadMessageCount } from '../../hooks/useUnreadMessageCount'

type Props = {
  role: 'student' | 'renter' | 'landlord'
  active: UserDashboardSection
  /** Landlord dashboard only - pending booking count badge on Bookings tab */
  pendingBookings?: number
  totalBookings?: number
  onSelect?: (section: Exclude<UserDashboardSection, 'messages'>) => void
  /** Flush under site header — no outer margin; parent owns the border. */
  embedded?: boolean
}

const landlordTabBaseClass =
  'inline-flex items-center justify-center gap-0.5 min-w-0 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap'

const landlordTabBadgeClass =
  'tabular-nums inline-flex shrink-0 items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white leading-none'

function landlordTabClass(isActive: boolean): string {
  return [
    landlordTabBaseClass,
    isActive
      ? 'border-[var(--quni-coral)] text-[var(--quni-ink)] bg-white/80 font-semibold -mb-px'
      : 'border-transparent text-[var(--quni-ink-4)] font-medium hover:text-[var(--quni-ink)] hover:bg-white/50',
  ].join(' ')
}

const renterTabBaseClass =
  'flex w-full sm:inline-flex sm:w-auto items-center justify-center gap-0.5 min-h-[44px] sm:min-h-0 min-w-0 px-0 sm:px-2 py-2.5 text-[12px] sm:text-sm border-b-2 transition-colors whitespace-nowrap'

function renterTabClass(isActive: boolean): string {
  return [
    renterTabBaseClass,
    isActive
      ? 'border-[var(--quni-coral)] text-[var(--quni-ink)] font-semibold -mb-px'
      : 'border-transparent text-[var(--quni-ink-4)] font-medium hover:text-[var(--quni-ink)]',
  ].join(' ')
}

export default function UserDashboardSectionNav({
  role,
  active,
  pendingBookings = 0,
  totalBookings = 0,
  onSelect,
  embedded = false,
}: Props) {
  const { user } = useAuthContext()
  const unreadMessageCount = useUnreadMessageCount(user?.id)

  if (role === 'landlord') {
    const bookingsBadge =
      pendingBookings > 0 ? pendingBookings : totalBookings > 0 ? totalBookings : null

    // Desktop / sm+ top strip only — mobile uses LandlordMobileBottomNav.
    return (
      <div className={embedded ? '' : 'mb-6 border-b border-gray-200'}>
        <nav
          className="flex justify-start gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mb-px"
          aria-label="Dashboard sections"
        >
          <button
            type="button"
            onClick={() => onSelect?.('overview')}
            className={landlordTabClass(active === 'overview')}
          >
            <span className="truncate">Overview</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect?.('listings')}
            className={landlordTabClass(active === 'listings')}
          >
            <span className="truncate">Listings</span>
          </button>
          <Link to="/messages" className={landlordTabClass(active === 'messages')}>
            <span className="truncate">Messages</span>
            {unreadMessageCount > 0 && (
              <span className={landlordTabBadgeClass}>
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </Link>
          <Link to={landlordBookingsPath()} className={landlordTabClass(active === 'bookings')}>
            <span className="truncate">Bookings</span>
            {bookingsBadge != null && (
              <span className={landlordTabBadgeClass}>
                {bookingsBadge > 9 ? '9+' : bookingsBadge}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => onSelect?.('profile')}
            className={landlordTabClass(active === 'profile')}
            aria-label="Profile"
            title="Profile"
          >
            <span>Profile</span>
          </button>
        </nav>
      </div>
    )
  }

  return (
    <div
      className={
        embedded
          ? 'overflow-hidden'
          : 'border-b border-[var(--quni-line)] mb-6 -mx-4 overflow-hidden sm:mx-0'
      }
    >
      <nav
        className="grid w-full min-w-0 grid-cols-5 items-end -mb-px sm:flex sm:justify-start sm:gap-5"
        aria-label="Dashboard sections"
      >
        <button
          type="button"
          onClick={() => onSelect?.('overview')}
          className={renterTabClass(active === 'overview')}
        >
          <span className="truncate">Overview</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect?.('bookings')}
          className={renterTabClass(active === 'bookings')}
        >
          <span className="truncate">Bookings</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect?.('saved')}
          className={renterTabClass(active === 'saved')}
        >
          <span className="truncate">Saved</span>
        </button>
        <Link to="/messages" className={renterTabClass(active === 'messages')}>
          <span className="truncate">Messages</span>
          {unreadMessageCount > 0 && (
            <span className="tabular-nums inline-flex shrink-0 items-center justify-center min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--quni-coral)] text-[9px] font-bold text-white leading-none">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </span>
          )}
        </Link>
        <Link to="/student-profile" className={renterTabClass(active === 'profile')}>
          <span className="truncate">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
