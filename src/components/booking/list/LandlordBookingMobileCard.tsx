import { Link } from 'react-router-dom'
import type { LandlordSeenStudentVerification } from '../../landlord/LandlordApplicantVerificationBadges'
import { formatBookingListWeeklyRent } from '../../../lib/bookingListMobileDisplay'
import BookingListDetailStrip from './BookingListDetailStrip'
import BookingListStatusPill from './BookingListStatusPill'
import BookingListVerificationChips from './BookingListVerificationChips'

export const bookingListMobileCardClass = 'quni-card p-4'

type ActionLink = {
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  variant: 'primary' | 'secondary'
}

type Props = {
  studentName: string
  onStudentClick?: () => void
  verification: LandlordSeenStudentVerification | null | undefined
  propertyTitle: string
  propertySuburb?: string | null
  serviceLabel: string
  moveInLabel: string
  endLabel: string
  weeklyRent: number | null | undefined
  status: string
  actions: ActionLink[]
  footnote?: string | null
}

function actionClass(variant: 'primary' | 'secondary', disabled?: boolean): string {
  const base = 'inline-flex min-h-[44px] items-center text-[13px] font-semibold underline-offset-2'
  if (variant === 'primary') {
    return `${base} text-[var(--quni-coral)] hover:underline ${disabled ? 'opacity-50 pointer-events-none' : ''}`
  }
  return `${base} text-[var(--quni-ink-4)] hover:underline`
}

export default function LandlordBookingMobileCard({
  studentName,
  onStudentClick,
  verification,
  propertyTitle,
  propertySuburb,
  serviceLabel,
  moveInLabel,
  endLabel,
  weeklyRent,
  status,
  actions,
  footnote,
}: Props) {
  const suburbLine = [propertySuburb?.trim(), serviceLabel].filter(Boolean).join(' · ')

  return (
    <article className={bookingListMobileCardClass}>
      <div className="flex items-start justify-between gap-3">
        {onStudentClick ? (
          <button
            type="button"
            onClick={onStudentClick}
            className="min-w-0 text-left text-[15px] font-semibold text-[var(--quni-navy)] hover:underline underline-offset-2"
          >
            {studentName}
          </button>
        ) : (
          <p className="min-w-0 text-[15px] font-semibold text-[var(--quni-navy)]">{studentName}</p>
        )}
        <BookingListStatusPill status={status} />
      </div>

      <div className="mt-3 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--quni-ink)]">{propertyTitle}</p>
        {suburbLine ? <p className="mt-0.5 text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p> : null}
      </div>

      <div className="mt-3">
        <BookingListDetailStrip
          moveInLabel={moveInLabel}
          endLabel={endLabel}
          weeklyRentLabel={formatBookingListWeeklyRent(weeklyRent)}
        />
      </div>

      <div className="mt-3">
        <BookingListVerificationChips verification={verification} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {actions.map((action) => {
          const className = actionClass(action.variant, action.disabled)
          if (action.href) {
            return (
              <Link key={action.label} to={action.href} className={className}>
                {action.label}
              </Link>
            )
          }
          return (
            <button
              key={action.label}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={className}
            >
              {action.label}
            </button>
          )
        })}
      </div>

      {footnote ? <p className="mt-2 text-[11px] leading-snug text-[var(--quni-ink-4)]">{footnote}</p> : null}
    </article>
  )
}
