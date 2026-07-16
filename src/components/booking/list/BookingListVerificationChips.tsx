import { Check } from 'lucide-react'
import type { LandlordSeenStudentVerification } from '../../landlord/LandlordApplicantVerificationBadges'
import { buildBookingListVerificationChips } from '../../../lib/bookingListMobileDisplay'

const chipClass = {
  neutral:
    'inline-flex items-center gap-1 rounded-full border border-[#E5E4E7] bg-[#F4F3EC] px-2.5 py-1 text-[11px] font-semibold text-[#08060D]',
  navy: 'inline-flex items-center gap-1 rounded-full border border-[rgba(31,42,68,0.18)] bg-[rgba(31,42,68,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[#1F2A44]',
} as const

type Props = {
  verification: LandlordSeenStudentVerification | null | undefined
}

/** Mobile booking list chips — role-based neutral/navy styling per design system. */
export default function BookingListVerificationChips({ verification }: Props) {
  const chips = buildBookingListVerificationChips(verification)
  if (chips.length === 0) {
    return <p className="text-[12px] text-[#6B6375]">No verification completed.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Applicant verification">
      {chips.map((chip) => (
        <span key={chip.label} className={chipClass[chip.variant]}>
          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
          {chip.label}
        </span>
      ))}
    </div>
  )
}
