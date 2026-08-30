import { describe, expect, it, vi } from 'vitest'
import { ensureLandlordStripeCustomer, ensureStudentStripeCustomer } from './ensureStripeCustomerOnProfile.js'

function adminThatSaves(id: string, onTable?: (table: string) => void) {
  return {
    from: (table: string) => {
      onTable?.(table)
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: { stripe_customer_id: id }, error: null }),
            }),
          }),
        }),
      }
    },
  }
}

const missingErr = () => {
  const err = new Error("No such customer: 'cus_stale'")
  Object.assign(err, { code: 'resource_missing', type: 'StripeInvalidRequestError' })
  return err
}

describe('ensureStudentStripeCustomer', () => {
  it('persists a replacement Customer on student_profiles when the stored id is missing', async () => {
    const tables: string[] = []
    const stripe = {
      customers: {
        retrieve: vi.fn(async () => {
          throw missingErr()
        }),
        create: vi.fn(async () => ({ id: 'cus_renter_new' })),
      },
    }
    const result = await ensureStudentStripeCustomer({
      stripe,
      admin: adminThatSaves('cus_renter_new', (t) => tables.push(t)),
      profile: {
        id: 'st1',
        stripe_customer_id: 'cus_stale',
        email: 'renter@example.com',
        first_name: 'Ren',
        last_name: 'Ter',
      },
      user: { id: 'u-renter', email: 'renter@example.com' },
    })
    expect(result).toEqual({ ok: true, customerId: 'cus_renter_new' })
    expect(tables).toEqual(['student_profiles'])
    expect(stripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ student_profile_id: 'st1' }),
      }),
    )
  })
})

describe('ensureLandlordStripeCustomer still writes landlord_profiles', () => {
  it('uses landlord table and metadata when replacing a missing Customer', async () => {
    const tables: string[] = []
    const stripe = {
      customers: {
        retrieve: vi.fn(async () => {
          throw missingErr()
        }),
        create: vi.fn(async () => ({ id: 'cus_ll_new' })),
      },
    }
    const result = await ensureLandlordStripeCustomer({
      stripe,
      admin: adminThatSaves('cus_ll_new', (t) => tables.push(t)),
      profile: { id: 'lp1', stripe_customer_id: 'cus_stale', email: 'll@example.com' },
      user: { id: 'u-ll', email: 'll@example.com' },
    })
    expect(result).toEqual({ ok: true, customerId: 'cus_ll_new' })
    expect(tables).toEqual(['landlord_profiles'])
  })
})
