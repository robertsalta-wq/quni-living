import { Lock } from 'lucide-react'
import {
  computeRenterProfileDriverProgress,
  type RenterReadiness,
} from '../../../lib/renterReadiness'
import type { Database } from '../../../lib/database.types'
import type { RenterSituation } from '../../../lib/renterSituation'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  readiness: RenterReadiness
  profile: StudentRow
  situation: RenterSituation | null
  verificationComplete: boolean
}

export function RenterProfileReadinessDriver({ readiness, profile, situation, verificationComplete }: Props) {
  const { done, total, pct } = computeRenterProfileDriverProgress(profile, situation, verificationComplete)
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
