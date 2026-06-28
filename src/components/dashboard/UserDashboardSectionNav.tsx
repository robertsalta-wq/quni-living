import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
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
}

const landlordTabBaseClass =
  'inline-flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 px-1 sm:px-4 py-2.5 text-[13px] sm:text-sm border-b-2 transition-colors shrink-0 sm:rounded-t-lg'

function landlordTabClass(isActive: boolean): string {
  return [
    landlordTabBaseClass,
    isActive
      ? 'border-admin-coral text-admin-ink font-semibold -mb-px sm:border-indigo-600 sm:text-indigo-700 sm:bg-white sm:font-medium'
      : 'border-transparent text-admin-ink-4 font-medium sm:text-gray-500 sm:hover:text-gray-800 sm:hover:bg-gray-100/80',
  ].join(' ')
}

const renterTabBaseClass =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-1 sm:px-2 py-3 text-sm border-b-2 transition-colors shrink-0'

function renterTabClass(isActive: boolean): string {
  return [
    renterTabBaseClass,
    isActive
      ? 'border-[#FF6F61] text-[#08060D] font-semibold -mb-px'
      : 'border-transparent text-[#6B6375] font-medium hover:text-[#08060D]',
  ].join(' ')
}

export default function UserDashboardSectionNav({
  role,
  active,
  pendingBookings = 0,
  totalBookings = 0,
  onSelect,
}: Props) {
  const { user } = useAuthContext()
  const unreadMessageCount = useUnreadMessageCount(user?.id)

  if (role === 'landlord') {
    const bookingsBadge =
      pendingBookings > 0 ? pendingBookings : totalBookings > 0 ? totalBookings : null

    return (
      <div className="border-b border-gray-200 mb-6">
        <nav
          className="flex w-full items-end justify-between -mb-px overflow-x-hidden sm:justify-start sm:gap-1 sm:overflow-x-auto"
          aria-label="Dashboard sections"
        >
          <button
            type="button"
            onClick={() => onSelect?.('overview')}
            className={landlordTabClass(active === 'overview')}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onSelect?.('listings')}
            className={landlordTabClass(active === 'listings')}
          >
            Listings
          </button>
          <Link to="/messages" className={landlordTabClass(active === 'messages')}>
            Messages
            {unreadMessageCount > 0 && (
              <span className="tabular-nums rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[1.25rem] text-center">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </Link>
          <Link to={landlordBookingsPath()} className={landlordTabClass(active === 'bookings')}>
            Bookings
            {bookingsBadge != null && (
              <span className="tabular-nums rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white min-w-[1.25rem] text-center">
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
            <User className="h-[19px] w-[19px] sm:hidden" strokeWidth={1.9} aria-hidden />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </nav>
      </div>
    )
  }

  return (
    <div className="border-b border-[#E5E4E7] mb-6">
      <nav
        className="flex w-full min-w-0 items-end gap-5 sm:gap-7 -mb-px overflow-x-auto"
        aria-label="Dashboard sections"
      >
        <button
          type="button"
          onClick={() => onSelect?.('bookings')}
          className={renterTabClass(active === 'bookings')}
        >
          Bookings
        </button>
        <Link to="/messages" className={renterTabClass(active === 'messages')}>
          Messages
          {unreadMessageCount > 0 && (
            <span className="tabular-nums inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6F61] text-[11px] font-bold text-white">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </span>
          )}
        </Link>
        <Link to="/student-profile" className={renterTabClass(active === 'profile')}>
          Profile
        </Link>
      </nav>
    </div>
  )
}
