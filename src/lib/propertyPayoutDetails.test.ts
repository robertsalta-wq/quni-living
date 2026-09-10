import { describe, expect, it } from 'vitest'
import {
  propertyPayoutDetailsComplete,
  propertyPayoutDetailsFieldErrors,
  propertyPayoutDetailsQldRoomingComplete,
  propertyPayoutDetailsQldRoomingSaveError,
} from './propertyPayoutDetails'

const complete = {
  bank_name: 'CBA',
  account_name: 'Quinnvestments Pty Ltd',
  bsb: '062-000',
  account_number: '12345678',
}

describe('propertyPayoutDetails', () => {
  it('treats empty payout as complete enough for non-QLD listing save', () => {
    expect(propertyPayoutDetailsFieldErrors({})).toEqual([])
    expect(propertyPayoutDetailsComplete({})).toBe(false)
  })

  it('requires bank name plus account details for QLD rooming save', () => {
    expect(propertyPayoutDetailsQldRoomingSaveError({})).toMatch(/Bank name/)
    expect(propertyPayoutDetailsQldRoomingComplete({ ...complete, bank_name: '' })).toBe(false)
    expect(propertyPayoutDetailsQldRoomingComplete(complete)).toBe(true)
    expect(propertyPayoutDetailsQldRoomingSaveError(complete)).toBeNull()
  })

  it('does not require bank name for the Listing accept complete check', () => {
    expect(propertyPayoutDetailsComplete({ ...complete, bank_name: '' })).toBe(true)
  })
})
