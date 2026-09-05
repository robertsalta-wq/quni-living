import { describe, expect, it } from 'vitest'
import {
  isQldOnSiteBoarderLodgerListing,
  parseRoomsRentedToResidents,
  qldRoomsRentedFieldError,
  qldRoomsRentedRoomingNotice,
} from './qldBoarderLodger'

describe('qldBoarderLodger', () => {
  it('detects QLD on-site listings', () => {
    expect(isQldOnSiteBoarderLodgerListing('QLD', 'private_room_landlord_on_site')).toBe(true)
    expect(isQldOnSiteBoarderLodgerListing('NSW', 'private_room_landlord_on_site')).toBe(false)
    expect(isQldOnSiteBoarderLodgerListing('QLD', 'private_room_landlord_off_site')).toBe(false)
  })

  it('validates rooms rented for s 43 threshold', () => {
    expect(qldRoomsRentedFieldError(null)).toMatch(/Enter how many rooms/)
    expect(qldRoomsRentedFieldError(2)).toBeNull()
    expect(qldRoomsRentedFieldError(3)).toBeNull()
    expect(qldRoomsRentedFieldError(4)).toBeNull()
    expect(parseRoomsRentedToResidents('2')).toBe(2)
  })

  it('notices rooming on live-in 4+ without blocking save', () => {
    expect(qldRoomsRentedRoomingNotice(3)).toBeNull()
    expect(qldRoomsRentedRoomingNotice(4)).toMatch(/Form R18/)
    expect(qldRoomsRentedRoomingNotice(4)).toMatch(/Do not use a registered rooming house listing/)
  })
})
