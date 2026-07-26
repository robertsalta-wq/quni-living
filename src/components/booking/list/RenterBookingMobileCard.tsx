import { Link } from 'react-router-dom'
import { formatBookingListWeeklyRent } from '../../../lib/bookingListMobileDisplay'
import { tenantBookingStatusLabel } from '../../../lib/tenantBookingStatus'
import type { TenantBookingStatus } from '../../../lib/tenantCurrentBooking'
import BookingListDetailStrip from './BookingListDetailStrip'
import BookingListStatusPill from './BookingListStatusPill'
import { bookingListMobileCardClass } from './LandlordBookingMobileCard'

type Props = {
  propertyTitle: string
  propertySuburb?: string | null
  serviceLabel?: string | null
  moveInLabel: string
  endLabel: string
  weeklyRent: number | null | undefined
  status: TenantBookingStatus
  propertySlug?: string | null
}

export default function RenterBookingMobileCard({
  propertyTitle,
  propertySuburb,
  serviceLabel,
  moveInLabel,
  endLabel,
  weeklyRent,
  status,
  propertySlug,
}: Props) {
  const suburbLine = [propertySuburb?.trim(), serviceLabel?.trim()].filter(Boolean).join(' · ')

  return (
    <article className={bookingListMobileCardClass}>
      <div className="flex items-start justify-between gap-3">
        {propertySlug ? (
          <Link
            to={`/properties/${propertySlug}`}
            className="min-w-0 text-[15px] font-semibold text-[var(--quni-navy)] hover:underline underline-offset-2"
          >
            {propertyTitle}
          </Link>
        ) : (
          <p className="min-w-0 text-[15px] font-semibold text-[var(--quni-navy)]">{propertyTitle}</p>
        )}
        <BookingListStatusPill status={status} label={tenantBookingStatusLabel(status)} />
      </div>

      {suburbLine ? <p className="mt-2 text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p> : null}

      <div className="mt-3">
        <BookingListDetailStrip
          moveInLabel={moveInLabel}
          endLabel={endLabel}
          weeklyRentLabel={formatBookingListWeeklyRent(weeklyRent)}
        />
      </div>
    </article>
  )
}
