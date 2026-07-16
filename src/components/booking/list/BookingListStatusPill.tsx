import { bookingListStatusLabel, bookingListStatusPillClass } from '../../../lib/bookingListMobileDisplay'

type Props = {
  status: string
  label?: string
  className?: string
}

export default function BookingListStatusPill({ status, label, className }: Props) {
  return (
    <span className={className ?? bookingListStatusPillClass(status)}>
      {label ?? bookingListStatusLabel(status)}
    </span>
  )
}
