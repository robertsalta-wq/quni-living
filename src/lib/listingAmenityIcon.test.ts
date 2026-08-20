import { describe, expect, it } from 'vitest'
import { listingAmenityIconForName } from './listingAmenityIcon'

describe('listingAmenityIconForName', () => {
  it('maps Ceiling fan next to Air conditioning / Heating icons', () => {
    expect(listingAmenityIconForName('Air conditioning')).toBe('❄️')
    expect(listingAmenityIconForName('Ceiling fan')).toBe('🌬️')
    expect(listingAmenityIconForName('Heating')).toBe('🔥')
  })

  it('does not treat Ceiling fan as a washing machine', () => {
    expect(listingAmenityIconForName('Washing machine')).toBe('🫧')
    expect(listingAmenityIconForName('Ceiling fan')).not.toBe('🫧')
  })
})
