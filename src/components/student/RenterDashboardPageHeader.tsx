import UserDashboardSectionNav from '../dashboard/UserDashboardSectionNav'
import type { UserDashboardSection } from '../../lib/userDashboardNav'

export type RenterDashboardTab = 'overview' | 'bookings'

const TAB_SUBTITLES: Record<RenterDashboardTab, string> = {
  overview: "Here's what's happening with your bookings, messages and saved rooms.",
  bookings: 'Track your booking requests and stays.',
}

type Props = {
  activeTab: RenterDashboardTab | 'messages' | 'profile'
  onTabSelect: (section: Exclude<UserDashboardSection, 'messages'>) => void
}

export const renterDashboardPageInsetClass =
  'max-w-site mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8 py-7 sm:py-10'

export function renterDashboardTabSubtitle(tab: RenterDashboardTab): string {
  return TAB_SUBTITLES[tab]
}

export default function RenterDashboardPageHeader({ activeTab, onTabSelect }: Props) {
  const subtitleTab: RenterDashboardTab = activeTab === 'bookings' ? 'bookings' : 'overview'

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#08060D] tracking-tight leading-tight">Dashboard</h1>
        <p className="text-sm text-[#6B6375] mt-1">{renterDashboardTabSubtitle(subtitleTab)}</p>
      </div>
      <UserDashboardSectionNav role="renter" active={activeTab} onSelect={onTabSelect} />
    </>
  )
}
