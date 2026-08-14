import { describe, expect, it } from 'vitest'
import { nswBoardingHouseLeaseMetadata } from './nswBoardingHouseMetadata.js'

describe('nswBoardingHouseLeaseMetadata', () => {
  it('sets document generator and snapshots charges on a lease row', () => {
    const meta = nswBoardingHouseLeaseMetadata(
      { leftover: true },
      [{ item: 'Electricity', amount: '$20', whenDue: 'Monthly', howCalculated: 'Equal split of the bill' }],
    )
    expect(meta).toMatchObject({
      leftover: true,
      generator: 'nsw-boarding-house',
      additional_charges: [
        {
          item: 'Electricity',
          amount: '$20',
          when_due: 'Monthly',
          how_calculated: 'Equal split of the bill',
        },
      ],
    })
  })
})
