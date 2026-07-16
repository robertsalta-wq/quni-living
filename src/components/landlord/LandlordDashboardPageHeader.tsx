import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import UserDashboardSectionNav from '../dashboard/UserDashboardSectionNav'
import { landlordDashboardTabPath, type UserDashboardSection } from '../../lib/userDashboardNav'
import { landlordDashboardHeading } from '../../lib/landlordProfileReadiness'
import type { LandlordProfileRow } from '../../lib/authProfile'

type LandlordTab = Exclude<UserDashboardSection, 'saved'>

const TAB_SUBTITLES: Record<LandlordTab, string> = {
  overview: 'Here\u2019s what\u2019s happening with your listings, messages, and booking requests.',
  listings: 'Manage your property listings.',
  bookings: 'Review and respond to booking requests.',
  profile: 'Complete your profile to publish a listing and accept bookings.',
  messages: 'Your conversations with renters.',
}

type Props = {
  profile: LandlordProfileRow
  activeTab: LandlordTab
  pendingBookings?: number
  totalBookings?: number
  onTabSelect: (section: Exclude<UserDashboardSection, 'messages' | 'saved'>) => void
}

export const landlordDashboardPageInsetClass =
  'max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pt-5 lg:pb-10'

export function landlordDashboardTabSubtitle(tab: LandlordTab): string {
  return TAB_SUBTITLES[tab]
}

export default function LandlordDashboardPageHeader({
  profile,
  activeTab,
  pendingBookings,
  totalBookings,
  onTabSelect,
}: Props) {
  return (
    <>
      <div className="mb-6 hidden sm:block">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{landlordDashboardHeading(profile)}</h1>
        <p className="text-sm text-gray-500 mt-1">{landlordDashboardTabSubtitle(activeTab)}</p>
      </div>
      <div className="hidden sm:block">
        <UserDashboardSectionNav
          role="landlord"
          active={activeTab}
          pendingBookings={pendingBookings}
          totalBookings={totalBookings}
          onSelect={(section) => {
            if (section === 'saved') return
            onTabSelect(section)
          }}
        />
      </div>
    </>
  )
}

type LandlordMessagesTabShellProps = {
  profile: LandlordProfileRow
  children: ReactNode
  contentClassName?: string
}

/** Shared chrome for /messages and /messages/:id when viewed as a landlord. */
export function LandlordMessagesTabShell({ profile, children, contentClassName = '' }: LandlordMessagesTabShellProps) {
  const navigate = useNavigate()
  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full bg-gray-50 max-sm:pb-0 pb-16 ${contentClassName}`}>
      <div className={landlordDashboardPageInsetClass}>
        <LandlordDashboardPageHeader
          profile={profile}
          activeTab="messages"
          onTabSelect={(section) => navigate(landlordDashboardTabPath(section))}
        />
        {children}
      </div>
    </div>
  )
}
