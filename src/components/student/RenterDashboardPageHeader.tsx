import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import UserDashboardSectionNav from '../dashboard/UserDashboardSectionNav'
import { studentDashboardTabPath, type UserDashboardSection } from '../../lib/userDashboardNav'

export type RenterDashboardTab = 'overview' | 'bookings' | 'saved'

type Props = {
  activeTab: RenterDashboardTab | 'messages' | 'profile'
  onTabSelect: (section: Exclude<UserDashboardSection, 'messages'>) => void
}

export const renterDashboardPageInsetClass =
  'max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pt-5 sm:pb-10'

export default function RenterDashboardPageHeader({ activeTab, onTabSelect }: Props) {
  return (
    <>
      <h1 className="mb-4 hidden text-[28px] font-bold leading-tight tracking-tight text-[#08060D] sm:block">
        Dashboard
      </h1>
      <div className="hidden sm:block">
        <UserDashboardSectionNav role="renter" active={activeTab} onSelect={onTabSelect} />
      </div>
    </>
  )
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
  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full bg-[#F7F8FA] max-sm:pb-0 pb-16 ${contentClassName}`}>
      <div className={renterDashboardPageInsetClass}>
        <RenterDashboardPageHeader
          activeTab={activeTab}
          onTabSelect={(section) => {
            if (section === 'overview' || section === 'bookings' || section === 'saved') {
              navigate(studentDashboardTabPath(section))
            }
          }}
        />
        {children}
      </div>
    </div>
  )
}
