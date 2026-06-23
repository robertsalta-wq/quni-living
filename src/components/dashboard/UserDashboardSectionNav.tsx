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
  onSelect?: (section: Exclude<UserDashboardSection, 'messages' | 'profile'>) => void
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
        <nav className="flex gap-1 -mb-px" aria-label="Dashboard sections">
          <button
            type="button"
            onClick={() => onSelect?.('listings')}
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
              active === 'listings'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
            ].join(' ')}
          >
            Listings
          </button>
          <Link
            to="/messages"
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
              active === 'messages'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
            ].join(' ')}
          >
            Messages
            {unreadMessageCount > 0 && (
              <span className="tabular-nums rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </Link>
          <Link
            to={landlordBookingsPath()}
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors inline-flex items-center gap-2',
              active === 'bookings'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/80',
            ].join(' ')}
          >
            Bookings
            {bookingsBadge != null && (
              <span className="tabular-nums rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {bookingsBadge}
              </span>
            )}
          </Link>
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
