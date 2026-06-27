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
    <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Dashboard sections">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'bookings'}
        onClick={() => onSelect?.('bookings')}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'bookings'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        Bookings
      </button>
      <Link
        to="/messages"
        role="tab"
        aria-selected={active === 'messages'}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 ${
          active === 'messages'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        Messages
        {unreadMessageCount > 0 && (
          <span className="tabular-nums rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
          </span>
        )}
      </Link>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'saved'}
        onClick={() => onSelect?.('saved')}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'saved'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
        }`}
      >
        Saved
      </button>
    </div>
  )
}
