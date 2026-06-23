import type { ReactNode } from 'react'
import UserDashboardBreadcrumb from './UserDashboardBreadcrumb'
import UserDashboardSectionNav from './UserDashboardSectionNav'
import type { UserDashboardCrumb, UserDashboardSection } from '../../lib/userDashboardNav'

type Props = {
  role: 'student' | 'renter' | 'landlord'
  breadcrumbs: UserDashboardCrumb[]
  activeSection?: UserDashboardSection
  showSectionNav?: boolean
  pendingBookings?: number
  totalBookings?: number
  onSectionSelect?: (section: Exclude<UserDashboardSection, 'messages' | 'profile'>) => void
  children: ReactNode
  /** Extra classes on the inner content wrapper */
  contentClassName?: string
}

export default function UserDashboardShell({
  role,
  breadcrumbs,
  activeSection,
  showSectionNav = false,
  pendingBookings,
  totalBookings,
  onSectionSelect,
  children,
  contentClassName = '',
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-gray-50 pb-16">
      <div className={`max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-10 ${contentClassName}`}>
        <UserDashboardBreadcrumb segments={breadcrumbs} className="mb-4" />
        {showSectionNav && activeSection ? (
          <UserDashboardSectionNav
            role={role}
            active={activeSection}
            pendingBookings={pendingBookings}
            totalBookings={totalBookings}
            onSelect={onSectionSelect}
          />
        ) : null}
        {children}
      </div>
    </div>
  )
}
