import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../booking/bookingBondAmount.js', () => ({
  resolveBookingBondAmountAud: vi.fn(() => 1600),
}))

vi.mock('../booking/tenantLegalNameForDocuments.js', () => ({
  tenantLegalNameForDocuments: vi.fn(() => 'Alex Student'),
}))

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(async () => Buffer.from('%PDF-mock')),
}))

vi.mock('../../documents/BondReceiptPdf.js', () => ({
  BondReceiptPdf: function BondReceiptPdf() {
    return null
  },
}))

vi.mock('../../documents/QldBondPaymentReceiptPdf.js', () => ({
  QldBondPaymentReceiptPdf: function QldBondPaymentReceiptPdf() {
    return null
  },
}))

import { generateAndPersistListingBondReceipt } from './listingBondReceipt.js'

function mockAdmin(opts: {
  tenancy?: Record<string, unknown> | null
  existingDoc?: { id: string } | null
  booking?: Record<string, unknown> | null
  property?: Record<string, unknown> | null
  insertError?: unknown
  insertId?: string
}) {
  const upload = vi.fn(async () => ({ error: null }))
  const from = vi.fn((table: string) => {
    if (table === 'tenancies') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.tenancy === undefined ? { id: 'ten1', property_id: 'pr1', student_profile_id: 'st1', landlord_profile_id: 'll1' } : opts.tenancy,
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'tenancy_documents') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.existingDoc ?? null,
                error: null,
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: opts.insertError }
                : { data: { id: opts.insertId ?? 'doc-bond-1' }, error: null },
          }),
        }),
      }
    }
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                opts.booking ??
                ({
                  bond_amount: 1600,
                  weekly_rent: 400,
                  bond_received_by_landlord_at: '2026-05-09T12:00:00.000Z',
                } as Record<string, unknown>),
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'properties') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                opts.property ??
                ({
                  address: '1 Test St',
                  suburb: 'Sydney',
                  state: 'NSW',
                  postcode: '2000',
                  property_type: 'private_room',
                  bond: 1600,
                  bond_weeks: 4,
                } as Record<string, unknown>),
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'landlord_profiles' || table === 'student_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                full_name: table === 'landlord_profiles' ? 'Host Name' : 'Alex Student',
                first_name: table === 'landlord_profiles' ? 'Host' : 'Alex',
                last_name: table === 'landlord_profiles' ? 'Name' : 'Student',
                email: table === 'landlord_profiles' ? 'host@example.com' : 'alex@example.com',
                verification_type: 'passport',
                legal_name_locked_at: '2026-01-01T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }
    }
    return {}
  })

  return {
    from,
    storage: {
      from: () => ({ upload }),
    },
    _upload: upload,
  }
}

describe('generateAndPersistListingBondReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates bond_receipt row + uploads PDF without patching tenancies bond_lodged_*', async () => {
    const admin = mockAdmin({})
    const result = await generateAndPersistListingBondReceipt({
      admin: admin as never,
      bookingId: 'bk1',
    })

    expect(result.status).toBe('created')
    if (result.status !== 'created') return
    expect(result.documentId).toBe('doc-bond-1')
    expect(result.filePath).toBe('ten1/bond/bond_receipt.pdf')
    expect(result.pdfBase64.length).toBeGreaterThan(0)
    expect(admin._upload).toHaveBeenCalled()
    // Never updates tenancies (no bond_lodged patch)
    expect(admin.from.mock.calls.filter((c) => c[0] === 'tenancies')).toHaveLength(1)
  })

  it('skips when bond_receipt already exists', async () => {
    const admin = mockAdmin({ existingDoc: { id: 'existing-doc' } })
    const result = await generateAndPersistListingBondReceipt({
      admin: admin as never,
      bookingId: 'bk1',
    })
    expect(result).toEqual({ status: 'skipped_exists', documentId: 'existing-doc' })
    expect(admin._upload).not.toHaveBeenCalled()
  })

  it('uses listing_residential metadata and NSW BondReceiptPdf path (non-QLD)', async () => {
    const admin = mockAdmin({})
    const insertSpy = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'doc-bond-1' }, error: null }),
      }),
    }))
    const origFrom = admin.from
    admin.from = vi.fn((table: string) => {
      if (table === 'tenancy_documents') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            expect(row.document_type).toBe('bond_receipt')
            expect((row.metadata as { receipt_variant?: string }).receipt_variant).toBe(
              'listing_residential',
            )
            return insertSpy()
          },
        }
      }
      return origFrom(table)
    }) as typeof admin.from

    const result = await generateAndPersistListingBondReceipt({
      admin: admin as never,
      bookingId: 'bk1',
    })
    expect(result.status).toBe('created')
  })
})
