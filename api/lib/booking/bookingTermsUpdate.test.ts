import { describe, expect, it } from 'vitest'
import { buildBookingTermsPatch } from './bookingTermsUpdate.js'

const property = {
  id: 'p1',
  bond_weeks: 4,
  state: 'NSW',
  property_type: 'private_room',
  is_registered_rooming_house: false,
}

const baseBooking = {
  id: 'b1',
  status: 'bond_pending',
  weekly_rent: 450,
  bond_amount: 1800,
  rent_breakdown: { base: 400, couple: 50, apply_weekly_rent: 450 },
  move_in_date: '2026-07-01',
  start_date: '2026-07-01',
  end_date: '2026-12-28',
  lease_length: '6 months',
  notes: 'Existing note',
  occupant_count: 1,
  housemates_count: 0,
  co_tenant: null,
}

const baseContext = {
  property,
  primaryTenantEmail: 'tenant@example.com',
  landlordProfileId: 'll1',
  reason: 'Updated terms before signing',
}

describe('buildBookingTermsPatch', () => {
  it('rejects unknown patch keys (fail-closed)', async () => {
    const result = await buildBookingTermsPatch(baseBooking, { status: 'active' }, baseContext)
    expect(result.errors).toContain('unknown_field:status')
    expect(result.patch).toEqual({})
  })

  it('does not recompute end_date on notes-only patch', async () => {
    const result = await buildBookingTermsPatch(
      baseBooking,
      { notes: 'New special conditions' },
      baseContext,
    )
    expect(result.errors).toEqual([])
    expect(result.patch.notes).toBe('New special conditions')
    expect(result.patch).not.toHaveProperty('end_date')
  })

  it('recomputes end_date when lease_length is in patch', async () => {
    const result = await buildBookingTermsPatch(
      baseBooking,
      { lease_length: '12 months' },
      baseContext,
    )
    expect(result.errors).toEqual([])
    expect(result.patch.lease_length).toBe('12 months')
    expect(result.patch.end_date).toBe('2027-06-30')
    expect(result.changes.end_date?.from).toBe('2026-12-28')
  })

  it('sets Flexible lease to null end_date', async () => {
    const result = await buildBookingTermsPatch(
      baseBooking,
      { lease_length: 'Flexible' },
      baseContext,
    )
    expect(result.errors).toEqual([])
    expect(result.patch.end_date).toBeNull()
  })

  it('clears co-tenant and sets occupant_count to 1 on co_tenant null', async () => {
    const booking = {
      ...baseBooking,
      occupant_count: 2,
      housemates_count: 1,
      co_tenant: {
        full_name: 'Co Tenant',
        email: 'co@example.com',
        phone: '0400000000',
        date_of_birth: '2000-01-01',
      },
    }
    const result = await buildBookingTermsPatch(booking, { co_tenant: null }, baseContext)
    expect(result.errors).toEqual([])
    expect(result.patch.co_tenant).toBeNull()
    expect(result.patch.occupant_count).toBe(1)
    expect(result.patch.housemates_count).toBe(0)
  })

  it('flags co_tenant_unverified when name or email changes', async () => {
    const booking = {
      ...baseBooking,
      occupant_count: 2,
      housemates_count: 1,
      co_tenant: {
        full_name: 'Co Tenant',
        email: 'co@example.com',
        phone: '0400000000',
        date_of_birth: '2000-01-01',
      },
    }
    const result = await buildBookingTermsPatch(
      booking,
      {
        co_tenant: {
          full_name: 'Co Tenant Renamed',
          email: 'co@example.com',
          phone: '0400000000',
          date_of_birth: '2000-01-01',
        },
      },
      baseContext,
    )
    expect(result.errors).toEqual([])
    expect(result.co_tenant_unverified).toBe(true)
  })

  it('rejects co-tenant email matching primary tenant', async () => {
    const result = await buildBookingTermsPatch(
      baseBooking,
      {
        co_tenant: {
          full_name: 'Co Tenant',
          email: 'tenant@example.com',
          phone: '0400000000',
          date_of_birth: '2000-01-01',
        },
      },
      baseContext,
    )
    expect(result.errors).toContain('co_tenant_email_must_differ')
  })

  it('rejects occupant_count >= 2 without co-tenant', async () => {
    const result = await buildBookingTermsPatch(baseBooking, { occupant_count: 3 }, baseContext)
    expect(result.errors).toContain('occupant_co_tenant_inconsistent')
  })

  it('applies bondOverride-only patch via rent/bond slice', async () => {
    const result = await buildBookingTermsPatch(
      baseBooking,
      { bondOverride: { enabled: true, weeks: 2 } },
      baseContext,
    )
    expect(result.errors).toEqual([])
    expect(result.patch.bond_amount).toBe(900)
    expect(result.patch.weekly_rent).toBe(450)
  })

  it('returns no_changes when patch values match current booking', async () => {
    const result = await buildBookingTermsPatch(baseBooking, { notes: 'Existing note' }, baseContext)
    expect(result.errors).toContain('no_changes')
  })
})
