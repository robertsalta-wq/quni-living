import type { LandlordListingUiStatus } from '../../../lib/landlordListingsGrouped'
import {
  landlordListingUiStatusLabel,
  landlordListingUiStatusPillClass,
} from '../../../lib/landlordListingsGrouped'

type Props = {
  status: LandlordListingUiStatus
  className?: string
}

export default function LandlordListingStatusPill({ status, className }: Props) {
  return (
    <span className={className ?? landlordListingUiStatusPillClass(status)}>
      {landlordListingUiStatusLabel(status)}
    </span>
  )
}
