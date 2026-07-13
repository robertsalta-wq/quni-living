import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import handler from './booking-update-terms.js'

const LANDLORD_USER_ID = 'user-ll-1'
const LANDLORD_PROFILE_ID = 'll-1'
const BOOKING_ID = 'book-1'
const STUDENT_ID = 'st-1'
const TENANCY_ID = 'ten-1'
const ANON_KEY = 'anon-key'
const SERVICE_KEY = 'service-role-key'

type DocSigns = {
  landlord_signed_at?: string | null
  student_signed_at?: string | null
  co_tenant_signed_at?: string | null
}

type HarnessOpts = {
  booking?: Record<string, unknown>
  tenancyId?: string | null
  doc?: (DocSigns & { id?: string; document_type?: string }) | null
  /** When false, tenancies.maybeSingle for id returns null (no tenancy row). */
  hasTenancy?: boolean
}

function baseBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    property_id: 'prop-1',
    student_id: STUDENT_ID,
    landlord_id: LANDLORD_PROFILE_ID,
    status: 'bond_pending',
    service_tier_at_request: 'listing',
    service_tier_final: 'listing',
    weekly_rent: 450,
    rent_breakdown: { base: 400, couple: 50, apply_weekly_rent: 450 },
    bond_amount: 1800,
    move_in_date: '2026-07-01',
    start_date: '2026-07-01',
    end_date: '2026-12-28',
    lease_length: '6 months',
    notes: 'Existing note',
    occupant_count: 1,
    housemates_count: 0,
    co_tenant: null,
    properties: {
      id: 'prop-1',
      bond: 1800,
      bond_weeks: 4,
      state: 'NSW',
      property_type: 'private_room',
      is_registered_rooming_house: false,
    },
    ...overrides,
  }
}

function mockRes() {
  const res: {
    statusCode: number
    body: unknown
    headers: Record<string, string>
    setHeader: (k: string, v: string) => void
    status: (code: number) => { json: (body: unknown) => unknown; end: () => unknown }
  } = {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(k, v) {
      res.headers[k] = v
    },
    status(code) {
      res.statusCode = code
      return {
        json(body: unknown) {
          res.body = body
          return res
        },
        end() {
          return res
        },
      }
    },
  }
  return res
}

function mockReq(body: unknown) {
  return {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      origin: 'https://example.test',
    },
    body,
  }
}

function buildClients(opts: HarnessOpts = {}) {
  const booking = baseBooking(opts.booking ?? {})
  const hasTenancy = opts.hasTenancy !== false && opts.tenancyId !== null
  const tenancyId = hasTenancy ? (opts.tenancyId ?? TENANCY_ID) : null
  const doc =
    opts.doc === undefined
      ? tenancyId
        ? {
            id: 'doc-1',
            document_type: 'residential_tenancy',
            landlord_signed_at: null,
            student_signed_at: null,
            co_tenant_signed_at: null,
          }
        : null
      : opts.doc

  const bookingUpdates: Record<string, unknown>[] = []
  const tenancyUpdates: Record<string, unknown>[] = []
  const events: Record<string, unknown>[] = []

  const authClient = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: LANDLORD_USER_ID,
            user_metadata: { role: 'landlord' },
          },
        },
        error: null,
      }),
    },
  }

  const admin = {
    from(table: string) {
      if (table === 'landlord_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: LANDLORD_PROFILE_ID }, error: null }),
            }),
          }),
        }
      }

      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: booking, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => {
            bookingUpdates.push(patch)
            return {
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: BOOKING_ID }, error: null }),
                  }),
                }),
              }),
            }
          },
        }
      }

      if (table === 'student_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'tenant@example.com' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'tenancies') {
        return {
          select: (columns: string) => {
            if (columns === 'id') {
              return {
                eq: () => ({
                  maybeSingle: async () =>
                    tenancyId
                      ? { data: { id: tenancyId }, error: null }
                      : { data: null, error: null },
                }),
              }
            }
            return {
              eq: () => ({
                maybeSingle: async () => ({
                  data: { start_date: booking.start_date, end_date: booking.end_date },
                  error: null,
                }),
              }),
            }
          },
          update: (patch: Record<string, unknown>) => {
            tenancyUpdates.push(patch)
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }

      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: doc ? [doc] : [],
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'service_tier_events') {
        return {
          insert: async (row: Record<string, unknown>) => {
            events.push(row)
            return { error: null }
          },
        }
      }

      throw new Error(`unexpected table ${table}`)
    },
    bookingUpdates,
    tenancyUpdates,
    events,
  }

  return { authClient, admin }
}

async function invoke(body: unknown, harness: HarnessOpts = {}) {
  const { authClient, admin } = buildClients(harness)
  mocks.createClient.mockImplementation((_url: string, key: string) => {
    if (key === ANON_KEY) return authClient
    if (key === SERVICE_KEY) return admin
    throw new Error(`unexpected supabase key ${key}`)
  })

  const req = mockReq(body)
  const res = mockRes()
  await handler(req, res)
  return { res, admin }
}

describe('POST /api/booking-update-terms endpoint guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY
    process.env.SUPABASE_ANON_KEY = ANON_KEY
  })

  it('returns 400 for an unknown patch key (endpoint maps builder validation_failed)', async () => {
    const { res, admin } = await invoke({
      bookingId: BOOKING_ID,
      patch: { status: 'active' },
      reason: 'Tenant request',
    })
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: 'validation_failed',
      messages: expect.arrayContaining(['unknown_field:status']),
    })
    expect(admin.bookingUpdates).toHaveLength(0)
  })

  it('returns 400 when reason is missing or shorter than 3 characters', async () => {
    const missing = await invoke({
      bookingId: BOOKING_ID,
      patch: { notes: 'Changed notes for terms' },
      reason: '',
    })
    expect(missing.res.statusCode).toBe(400)
    expect(missing.res.body).toMatchObject({ error: 'reason is required (at least 3 characters)' })

    const short = await invoke({
      bookingId: BOOKING_ID,
      patch: { notes: 'Changed notes for terms' },
      reason: 'ab',
    })
    expect(short.res.statusCode).toBe(400)
    expect(short.res.body).toMatchObject({ error: 'reason is required (at least 3 characters)' })
  })

  it('returns 400 for managed bookings', async () => {
    const { res } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { notes: 'Changed notes for terms' },
        reason: 'Tenant request',
      },
      {
        booking: {
          service_tier_at_request: 'managed',
          service_tier_final: 'managed',
          status: 'pending_confirmation',
        },
      },
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ error: 'managed_booking' })
  })

  it('returns 409 when status is outside pending_confirmation / awaiting_info / bond_pending', async () => {
    const { res } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { notes: 'Changed notes for terms' },
        reason: 'Tenant request',
      },
      { booking: { status: 'confirmed' } },
    )
    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({ error: 'invalid_booking_status' })
  })

  it.each([
    ['landlord_signed_at', { landlord_signed_at: '2026-07-01T00:00:00Z' }],
    ['student_signed_at', { student_signed_at: '2026-07-01T00:00:00Z' }],
    ['co_tenant_signed_at', { co_tenant_signed_at: '2026-07-01T00:00:00Z' }],
  ] as const)('returns 409 when %s is set on the lease doc', async (_label, signs) => {
    const { res, admin } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { notes: 'Changed notes for terms' },
        reason: 'Tenant request',
      },
      {
        doc: {
          id: 'doc-1',
          document_type: 'residential_tenancy',
          landlord_signed_at: null,
          student_signed_at: null,
          co_tenant_signed_at: null,
          ...signs,
        },
      },
    )
    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({ error: 'agreement_already_signed' })
    expect(admin.bookingUpdates).toHaveLength(0)
  })

  it('returns 200 at pending_confirmation when there is no tenancy document', async () => {
    const { res, admin } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { notes: 'Pre-doc note update' },
        reason: 'Tenant request',
      },
      {
        booking: { status: 'pending_confirmation', notes: 'Existing note' },
        hasTenancy: false,
        doc: null,
      },
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(admin.bookingUpdates).toHaveLength(1)
    expect(admin.bookingUpdates[0]).toMatchObject({ notes: 'Pre-doc note update' })
    expect(admin.tenancyUpdates).toHaveLength(0)
    expect(admin.events[0]).toMatchObject({ event_type: 'booking_terms_update' })
  })

  it('applies co_tenant null as occupant_count 1 and housemates_count 0 on the booking update', async () => {
    const { res, admin } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { co_tenant: null },
        reason: 'Tenant request',
      },
      {
        booking: {
          status: 'bond_pending',
          occupant_count: 2,
          housemates_count: 1,
          co_tenant: {
            full_name: 'Co Tenant',
            email: 'co@example.com',
            phone: '0400000000',
            date_of_birth: '2000-01-01',
          },
        },
      },
    )
    expect(res.statusCode).toBe(200)
    expect(admin.bookingUpdates[0]).toMatchObject({
      co_tenant: null,
      occupant_count: 1,
      housemates_count: 0,
    })
  })

  it('returns 400 when co-tenant email matches the primary tenant email', async () => {
    const { res, admin } = await invoke({
      bookingId: BOOKING_ID,
      patch: {
        co_tenant: {
          full_name: 'Co Tenant',
          email: 'tenant@example.com',
          phone: '0400000000',
          date_of_birth: '2000-01-01',
        },
      },
      reason: 'Tenant request',
    })
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: 'validation_failed',
      messages: expect.arrayContaining(['co_tenant_email_must_differ']),
    })
    expect(admin.bookingUpdates).toHaveLength(0)
  })

  it('syncs Flexible lease_length to null end_date on booking and tenancy', async () => {
    const { res, admin } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { lease_length: 'Flexible' },
        reason: 'Tenant request',
      },
      { booking: { status: 'bond_pending' } },
    )
    expect(res.statusCode).toBe(200)
    expect(admin.bookingUpdates[0]).toMatchObject({
      lease_length: 'Flexible',
      end_date: null,
    })
    expect(admin.tenancyUpdates).toEqual([{ end_date: null }])
  })

  it('does not change end_date on notes-only save (booking update omits end_date; no tenancy date sync)', async () => {
    const { res, admin } = await invoke(
      {
        bookingId: BOOKING_ID,
        patch: { notes: 'New special conditions only' },
        reason: 'Tenant request',
      },
      { booking: { status: 'bond_pending', notes: 'Existing note' } },
    )
    expect(res.statusCode).toBe(200)
    expect(admin.bookingUpdates[0]).toEqual({ notes: 'New special conditions only' })
    expect(admin.bookingUpdates[0]).not.toHaveProperty('end_date')
    expect(admin.tenancyUpdates).toHaveLength(0)
  })
})
