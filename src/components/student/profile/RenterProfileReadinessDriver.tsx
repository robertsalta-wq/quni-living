import { Lock } from 'lucide-react'
import ProfileReadinessDriver from '../../profile/ProfileReadinessDriver'
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

/** Pins below the fixed renter app chrome (tsc won't catch a missing string stickyTop). */
const STICKY_TOP = 'var(--quni-fixed-header-offset, 0px)'

/** Thin adapter — chrome lives in shared ProfileReadinessDriver. */
export function RenterProfileReadinessDriver({
  readiness,
  profile,
  situation,
  verificationComplete,
}: Props) {
  const { done, total, pct } = computeRenterProfileDriverProgress(profile, situation, verificationComplete)
  const complete = done === total && total > 0
  const driverText = readiness.blocksBooking[0] ?? 'Complete your profile to apply'

  return (
    <ProfileReadinessDriver
      eyebrow="Complete your profile"
      title={
        <>
          Profile <span className="text-[var(--quni-coral)]">{pct}%</span> complete
        </>
      }
      fraction={`${done} / ${total}`}
      fractionLabel="required done"
      steps={[]}
      progress={pct / 100}
      complete={complete}
      completeSubtitle="Ready to apply"
      stickyTop={STICKY_TOP}
      tone={complete ? 'positive' : 'default'}
      line={
        complete ? null : (
          <span className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{driverText}</span>
          </span>
        )
      }
    />
  )
}
