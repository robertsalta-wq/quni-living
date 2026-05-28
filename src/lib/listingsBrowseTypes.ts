import type { NearSearchAnchor } from './workplaceLocation'

export type ListingsQueryFilters = {
  q: string
  university: string
  campus: string
  suburb: string
  roomType: string
  priceFilter: string
  furnished: boolean
  sort: string
  nearAnchor: NearSearchAnchor | null
  availabilityMoveIn: string | null
  availabilityMoveOut: string | null
}
