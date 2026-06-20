import { describe, expect, it } from 'vitest'

import { bookingConfirmedLandlord } from './emailTemplates.js'

describe('bookingConfirmedLandlord (Managed)', () => {
  it('omits the four weeks rent descriptor from the bond block', () => {
    const t = bookingConfirmedLandlord({
      landlord_name: 'Jordan Host',
      property_address: '42 Example St, Sydney NSW 2000',
      student_name: 'Alex Student',
      move_in_date: '1 July 2026',
      lease_length: '6 months',
      weekly_rent: 450,
      deposit_amount_formatted: '$99.00',
      bond_amount_formatted: '$1,800.00',
      bond_authority: 'NSW Fair Trading',
      dashboard_url: 'https://example.test/landlord/dashboard',
    })
    expect(t.html).toContain('Bond record')
    expect(t.html).toContain('$1,800.00')
    expect(t.html).not.toContain('four weeks')
  })
})
