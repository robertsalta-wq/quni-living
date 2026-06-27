import {
  buildLandlordVerificationFromProfile,
  LandlordApplicantVerificationBadges,
  LandlordApplicantVerificationDetail,
} from './LandlordApplicantVerificationBadges'
import type { LandlordSafeStudentSnapshot } from './LandlordStudentProfileModal'

type Props = {
  student: LandlordSafeStudentSnapshot | null
  verificationAnchorId?: string
  /** Strip outer card chrome — for embedding in the right summary card. */
  embedded?: boolean
}

export default function LandlordApplicantVerificationSection({
  student,
  verificationAnchorId = 'landlord-applicant-verification',
  embedded = false,
}: Props) {
  const verification = buildLandlordVerificationFromProfile(student)

  if (embedded) {
    return (
      <div id={verificationAnchorId} className="scroll-mt-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-admin-ink-5">Verification</p>
        <LandlordApplicantVerificationDetail verification={verification} embedded />
      </div>
    )
  }

  return (
    <section
      id={verificationAnchorId}
      className="scroll-mt-4 rounded-xl border border-emerald-100/80 bg-emerald-50/40 px-4 py-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">Verification</h3>
      <p className="mt-1 text-xs text-gray-600">
        Document files are not shared; you only see whether each step was completed.
      </p>
      <div className="mt-3">
        <LandlordApplicantVerificationBadges verification={verification} />
      </div>
      <div className="mt-4 rounded-lg border border-white/80 bg-white/70 px-3 py-2">
        <LandlordApplicantVerificationDetail verification={verification} />
      </div>
    </section>
  )
}
