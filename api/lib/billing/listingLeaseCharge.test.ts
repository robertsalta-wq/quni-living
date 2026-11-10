import { beforeEach, describe, expect, it, vi } from 'vitest'

const retrieve = vi.fn()
const search = vi.fn()
const create = vi.fn()
const customersRetrieve = vi.fn()

vi.mock('stripe', () => ({
  default: class Stripe {
    paymentIntents = { retrieve, search, create }
    customers = { retrieve: customersRetrieve }
  },
}))

vi.mock('../sendEmail.js', () => ({ sendEmail: vi.fn(async () => undefined) }))
vi.mock('./leaseChargeInvoice.js', () => ({
  buildLeaseTaxInvoicePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])),
}))

const CHARGE_ID = '11111111-1111-4111-8111-111111111111'
const BOOKING_ID = '22222222-2222-4222-8222-222222222222'

function bookingRow() {
  return {
    id: BOOKING_ID,
    landlord_id: '33333333-3333-4333-8333-333333333333',
    property_id: '44444444-4444-4444-8444-444444444444',
    lease_length: '6 months',
    start_date: '2026-01-01',
    move_in_date: '2026-01-01',
    end_date: '2026-07-01',
    status: 'active',
    service_tier_final: 'listing',
    termination_effective_date: null,
    properties: { title: 'Room', address: '1 Test St', suburb: 'Ryde', state: 'NSW' },
  }
}

function adminMock(pending: Record<string, unknown>[]) {
  const updates: Record<string, unknown>[] = []
  const admin = {
    from(table: string) {
      if (table === 'listing_lease_charges') {
        return {
          select() {
            return {
              eq(column: string) {
                if (column === 'status') {
                  return {
                    lt(_col: string, cutoff: string) {
                      admin.cutoff = cutoff
                      return { limit: async () => ({ data: pending, error: null }) }
                    },
                  }
                }
                return {
                  single: async () => ({
                    data: {
                      months: 6,
                      credit_months: 0,
                      ex_gst_cents: 3000,
                      gst_cents: 300,
                      total_cents: 3300,
                    },
                    error: null,
                  }),
                }
              },
            }
          },
          update(patch: Record<string, unknown>) {
            updates.push(patch)
            return { eq: async () => ({ error: null }) }
          },
        }
      }
      if (table === 'bookings') {
        return {
          select() {
            return { eq: () => ({ maybeSingle: async () => ({ data: bookingRow(), error: null }) }) }
          },
        }
      }
      return {
        select() {
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'landlord@example.com', stripe_customer_id: 'cus_test', fee_exempt: false },
                error: null,
              }),
            }),
          }
        },
      }
    },
    storage: {
      from() {
        return { upload: async () => ({ error: null }) }
      },
    },
    cutoff: '' as string,
  }
  return { admin, updates }
}

describe('settleStuckPendingLeaseCharges', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_lease'
    retrieve.mockReset()
    search.mockReset()
    create.mockReset()
    customersRetrieve.mockReset()
    customersRetrieve.mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_test' },
    })
  })

  it('settles a stuck pending row from the existing PaymentIntent and does not charge again', async () => {
    const { settleStuckPendingLeaseCharges } = await import('./listingLeaseCharge.js')
    search.mockResolvedValue({
      data: [{ id: 'pi_already', status: 'succeeded' }],
    })
    const { admin, updates } = adminMock([
      {
        id: CHARGE_ID,
        booking_id: BOOKING_ID,
        charged_cents: 3300,
        attempt_count: 0,
        stripe_payment_intent_id: null,
      },
    ])

    const result = await settleStuckPendingLeaseCharges(admin as never, new Date('2026-11-10T05:00:00.000Z'))

    expect(result.settled).toBe(1)
    expect(create).not.toHaveBeenCalled()
    expect(updates.some((patch) => patch.status === 'succeeded' && patch.stripe_payment_intent_id === 'pi_already')).toBe(
      true,
    )
    expect(admin.cutoff).toBe('2026-11-10T04:30:00.000Z')
  })

  it('charges once, with the original idempotency key, when Stripe has no PaymentIntent', async () => {
    const { settleStuckPendingLeaseCharges } = await import('./listingLeaseCharge.js')
    search.mockResolvedValue({ data: [] })
    create.mockResolvedValue({ id: 'pi_new', status: 'succeeded' })
    const { admin } = adminMock([
      {
        id: CHARGE_ID,
        booking_id: BOOKING_ID,
        charged_cents: 3300,
        attempt_count: 0,
        stripe_payment_intent_id: null,
      },
    ])

    await settleStuckPendingLeaseCharges(admin as never, new Date('2026-11-10T05:00:00.000Z'))

    expect(create).toHaveBeenCalledTimes(1)
    expect(create.mock.calls[0]?.[1]).toEqual({ idempotencyKey: `lease-charge-${CHARGE_ID}-a1` })
  })

  it('does not create a PaymentIntent when the Stripe lookup fails', async () => {
    const { settleStuckPendingLeaseCharges } = await import('./listingLeaseCharge.js')
    search.mockRejectedValue(new Error('stripe down'))
    const { admin } = adminMock([
      {
        id: CHARGE_ID,
        booking_id: BOOKING_ID,
        charged_cents: 3300,
        attempt_count: 0,
        stripe_payment_intent_id: null,
      },
    ])

    const result = await settleStuckPendingLeaseCharges(admin as never, new Date('2026-11-10T05:00:00.000Z'))

    expect(result.settled).toBe(0)
    expect(create).not.toHaveBeenCalled()
  })
})
