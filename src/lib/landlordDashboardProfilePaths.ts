import type { LandlordPublishSectionKey } from './landlordProfileReadiness'

export type LandlordDashboardProfileSectionKey =
  | LandlordPublishSectionKey
  | 'payouts'
  | 'insurance'
  | 'languages'

export function landlordDashboardProfilePath(section?: LandlordDashboardProfileSectionKey): string {
  const base = '/landlord/dashboard?tab=profile'
  return section ? `${base}&section=${section}` : base
}

/** Map legacy hash targets to profile tab sections. */
export function landlordDashboardProfilePathFromHash(hash: string): string | null {
  const h = hash.replace(/^#/, '').trim()
  if (h === 'account-agreements') return landlordDashboardProfilePath('agreements')
  if (h === 'rent-payouts') return landlordDashboardProfilePath('payouts')
  if (h === 'landlord-profile-photo') return landlordDashboardProfilePath('about')
  return null
}
