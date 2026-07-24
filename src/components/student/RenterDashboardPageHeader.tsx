import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dashboardPageInsetClass,
  dashboardProfileMobilePadClass,
  dashboardProfilePageInsetClass,
} from '../../lib/dashboardPageInset'
import { studentDashboardTabPath, type UserDashboardSection } from '../../lib/userDashboardNav'

export type RenterDashboardTab = 'overview' | 'bookings' | 'saved'

type Props = {
  activeTab: RenterDashboardTab | 'messages' | 'profile'
  onTabSelect: (section: Exclude<UserDashboardSection, 'messages'>) => void
}

/** Alias of shared `dashboardPageInsetClass` (non-profile tabs). */
export const renterDashboardPageInsetClass = dashboardPageInsetClass

export default function RenterDashboardPageHeader({ activeTab: _activeTab, onTabSelect: _onTabSelect }: Props) {
  // Section strip + wordmark live in AppHeader; no body page title (matches landlord).
  return null
}

type RenterDashboardTabShellProps = {
  activeTab: RenterDashboardTab | 'messages' | 'profile'
  children: ReactNode
  contentClassName?: string
}

/** Shared chrome for /student-dashboard, /messages, /student-profile (Profile tab). */
export function RenterDashboardTabShell({
  activeTab,
  children,
  contentClassName = '',
}: RenterDashboardTabShellProps) {
  const navigate = useNavigate()
  const profileOwnsPadding = activeTab === 'profile'
  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full bg-[var(--quni-surface-2)] max-sm:pb-0 pb-16 ${contentClassName}`}>
      <div className={profileOwnsPadding ? dashboardProfilePageInsetClass : dashboardPageInsetClass}>
        <RenterDashboardPageHeader
          activeTab={activeTab}
          onTabSelect={(section) => {
            if (section === 'overview' || section === 'bookings' || section === 'saved') {
              navigate(studentDashboardTabPath(section))
            }
          }}
        />
        {profileOwnsPadding ? <div className={dashboardProfileMobilePadClass}>{children}</div> : children}
      </div>
    </div>
  )
}
