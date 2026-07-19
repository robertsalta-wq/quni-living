import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { landlordDashboardTabPath, type UserDashboardSection } from '../../lib/userDashboardNav'
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
  'max-w-site mx-auto w-full min-w-0 px-4 sm:px-8 pt-4 pb-8 sm:py-8 lg:pb-14'

export function landlordDashboardTabSubtitle(tab: LandlordTab): string {
  return TAB_SUBTITLES[tab]
}

export default function LandlordDashboardPageHeader({
  profile: _profile,
  activeTab: _activeTab,
  pendingBookings: _pendingBookings,
  totalBookings: _totalBookings,
  onTabSelect: _onTabSelect,
}: Props) {
  // Section strip + wordmark live in AppShellHeader; no body page title.
  return null
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
