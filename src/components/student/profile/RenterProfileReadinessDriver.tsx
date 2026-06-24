import { Lock } from 'lucide-react'
import type { RenterReadiness } from '../../../lib/renterReadiness'
import { isRouteSectionComplete } from '../../../lib/renterRouteSection'
import { isPersonalDetailsComplete } from '../../../lib/renterProfileSection'
import { isStep2Saved } from '../../../lib/studentOnboarding'
import type { Database } from '../../../lib/database.types'
import type { RenterSituation } from '../../../lib/renterSituation'
import { isGuarantorSectionComplete } from './RenterGuarantorSection'
import { incomeBandSuggestsGuarantor } from '../../../lib/renterIncomeBands'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  readiness: RenterReadiness
  profile: StudentRow
  situation: RenterSituation | null
  verificationComplete: boolean
}

function routeFlowNeedsGuarantor(profile: StudentRow, situation: RenterSituation | null): boolean {
  if (!situation) return false
  if (profile.has_guarantor === true) return true
  if (situation === 'student' || situation === 'working_holiday' || situation === 'backpacker') return false
  if (situation === 'working') {
    return !profile.income_band?.trim() || incomeBandSuggestsGuarantor(profile.income_band)
  }
  return incomeBandSuggestsGuarantor(profile.income_band)
}

function isRouteFlowComplete(profile: StudentRow, situation: RenterSituation | null): boolean {
  if (!situation || !isRouteSectionComplete(situation, profile)) return false
  const needsGuarantor = routeFlowNeedsGuarantor(profile, situation)
  return !needsGuarantor || isGuarantorSectionComplete(profile)
}

function requiredSectionsComplete(
  profile: StudentRow,
  situation: RenterSituation | null,
  verificationComplete: boolean,
): { done: number; total: number } {
  const total = 4
  if (!situation) {
    return { done: 0, total }
  }
  let done = 0
  if (isPersonalDetailsComplete(profile)) done += 1
  if (verificationComplete) done += 1
  if (isRouteFlowComplete(profile, situation)) done += 1
  if (isStep2Saved(profile)) done += 1
  return { done, total }
}

export function RenterProfileReadinessDriver({ readiness, profile, situation, verificationComplete }: Props) {
  const { done, total } = requiredSectionsComplete(profile, situation, verificationComplete)
  const pct = Math.round((done / total) * 100)
  const driverText = readiness.blocksBooking[0] ?? 'Complete your profile to request bookings'

  return (
    <div className="renter-profile-driver" role="status">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="renter-profile-driver-eyebrow">Complete your profile</div>
          <div className="renter-profile-driver-title">
            Profile <span className="renter-profile-driver-coral">{pct}%</span> complete
          </div>
        </div>
        <div style={{ flex: 'none', textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--quni-ink-2)' }}>
            {done} of {total} required done
          </div>
        </div>
      </div>
      <div className="renter-profile-progress-track" aria-hidden>
        <div className="renter-profile-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 9,
          fontSize: 13.5,
          color: 'var(--quni-ink-3)',
          lineHeight: 1.5,
        }}
      >
        <Lock size={17} style={{ flex: 'none', marginTop: 1, color: 'var(--quni-coral)' }} aria-hidden />
        <span>{driverText}</span>
      </div>
    </div>
  )
}
