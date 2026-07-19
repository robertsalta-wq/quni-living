import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { isRenterRole } from '../../lib/authProfile'
import { dashboardShellActiveSection } from '../../lib/dashboardMobileChrome'
import {
  landlordBookingsPath,
  landlordDashboardTabPath,
  studentDashboardTabPath,
  type UserDashboardSection,
} from '../../lib/userDashboardNav'
import UserDashboardSectionNav from '../dashboard/UserDashboardSectionNav'

type Props = {
  /** No top padding — sits flush under the site header in the sticky chrome stack. */
  flush?: boolean
}

/** Desktop / sm+ section strip owned by the app shell (not per-page). */
export default function AppShellSectionNav({ flush = false }: Props) {
  const { role } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()
  const active = dashboardShellActiveSection(role, location.pathname, location.search)

  if (!active) return null
  if (role !== 'landlord' && !isRenterRole(role)) return null

  function onSelect(section: Exclude<UserDashboardSection, 'messages'>) {
    if (role === 'landlord') {
      if (section === 'saved') return
      if (section === 'bookings') {
        navigate(landlordBookingsPath())
        return
      }
      navigate(landlordDashboardTabPath(section))
      return
    }
    if (section === 'listings') return
    if (section === 'overview' || section === 'bookings' || section === 'saved') {
      navigate(studentDashboardTabPath(section))
      return
    }
    if (section === 'profile') {
      navigate('/student-profile')
    }
  }

  return (
    <div className="hidden sm:block">
      <div className={`mx-auto max-w-site px-3 sm:px-6 ${flush ? 'pt-0' : 'pt-4'}`}>
        <UserDashboardSectionNav
          role={role === 'landlord' ? 'landlord' : 'renter'}
          active={active}
          onSelect={onSelect}
          embedded={flush}
        />
      </div>
    </div>
  )
}
