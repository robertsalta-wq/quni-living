import { describe, expect, it } from 'vitest'
import { appendLettingChoiceQuery, listingLettingOptions } from './lettingChoice'

describe('listingLettingOptions', () => {
  it('offers room to yourself, and two together only when that total is set', () => {
    expect(
      listingLettingOptions({
        property_type: 'private_room_landlord_off_site',
        rent_per_week: 280,
        together_weekly_rent: 420,
      }),
    ).toEqual([
      { choice: 'sole', label: 'Room to yourself', weeklyRent: 280 },
      { choice: 'together', label: 'Two people together', weeklyRent: 420 },
    ])
  })

  it('hides two together when the total is empty', () => {
    expect(
      listingLettingOptions({
        property_type: 'private_room_landlord_on_site',
        rent_per_week: 300,
        together_weekly_rent: null,
      }).map((o) => o.choice),
    ).toEqual(['sole'])
  })

  it('offers nothing on a shared room or an entire place', () => {
    expect(
      listingLettingOptions({
        property_type: 'shared_room',
        rent_per_week: 200,
        together_weekly_rent: 350,
      }),
    ).toEqual([])
    expect(
      listingLettingOptions({
        property_type: 'entire_property',
        rent_per_week: 600,
        together_weekly_rent: 800,
      }),
    ).toEqual([])
  })
})

describe('appendLettingChoiceQuery', () => {
  it('keeps an existing query', () => {
    expect(appendLettingChoiceQuery('/booking/abc?move_in=2026-12-01', 'together')).toBe(
      '/booking/abc?move_in=2026-12-01&letting=together',
    )
  })
})
