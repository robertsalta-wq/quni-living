import { Link } from 'react-router-dom'
import { formatBookingListWeeklyRent, bookingListStatusPillClass } from '../../../lib/bookingListMobileDisplay'
import { tenantBookingStatusLabel } from '../../../lib/tenantBookingStatus'
import type { TenantBookingStatus } from '../../../lib/tenantCurrentBooking'
import BookingListDetailStrip from './BookingListDetailStrip'
import BookingListStatusPill from './BookingListStatusPill'
import { bookingListMobileCardClass } from './LandlordBookingMobileCard'

function renterStatusPillClass(status: TenantBookingStatus): string {
  const base = 'inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none'
  if (status === 'confirmed' || status === 'active' || status === 'bond_pending') {
    return bookingListStatusPillClass('confirmed')
  }
  if (status === 'expired' || status === 'declined' || status === 'payment_failed' || status === 'cancelled') {
    return bookingListStatusPillClass('expired')
  }
  return `${base} bg-[#F4F3EC] text-[#6B6375]`
}

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
            className="min-w-0 text-[15px] font-semibold text-[#1F2A44] hover:underline underline-offset-2"
          >
            {propertyTitle}
          </Link>
        ) : (
          <p className="min-w-0 text-[15px] font-semibold text-[#1F2A44]">{propertyTitle}</p>
        )}
        <BookingListStatusPill
          status={status}
          label={tenantBookingStatusLabel(status)}
          className={renterStatusPillClass(status)}
        />
      </div>

      {suburbLine ? <p className="mt-2 text-[12px] text-[#6B6375]">{suburbLine}</p> : null}

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
