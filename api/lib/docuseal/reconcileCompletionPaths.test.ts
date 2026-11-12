import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  downloadSignedSubmissionPdfFromDocuseal: vi.fn(),
  downloadSignedResidentialTenancyPackagePartsFromDocuseal: vi.fn(),
  extractCompletedAt: vi.fn(),
  chargeListingLeaseOnSigned: vi.fn(),
  maybeAdvanceListingBookingToActive: vi.fn(),
}))

vi.mock('../docuseal.js', () => ({
  downloadSignedSubmissionPdfFromDocuseal: mocks.downloadSignedSubmissionPdfFromDocuseal,
  downloadSignedResidentialTenancyPackagePartsFromDocuseal:
    mocks.downloadSignedResidentialTenancyPackagePartsFromDocuseal,
  extractCompletedAt: mocks.extractCompletedAt,
}))

vi.mock('../documents/repairPdfContents.js', () => ({
  prepareSignedPdfForStorage: async (bytes: Uint8Array) => bytes,
}))

vi.mock('../booking/coTenantSigning.js', () => ({
  fetchCoTenantSignerForTenancy: vi.fn(async () => null),
}))

vi.mock('../booking/listingAgreementStatus.js', () => ({
  setListingAgreementStatus: vi.fn(),
}))

vi.mock('../billing/listingLeaseCharge.js', () => ({
  chargeListingLeaseOnSigned: mocks.chargeListingLeaseOnSigned,
}))

vi.mock('../booking/maybeAdvanceListingBookingToActive.js', () => ({
  maybeAdvanceListingBookingToActive: mocks.maybeAdvanceListingBookingToActive,
}))

import { syncFullySignedDocusealSubmission } from './reconcileFromDocuseal.js'

const tenancyId = 'ten-1'
const submissionId = '174'

function buildAdmin() {
  const uploads: string[] = []
  const updates: Record<string, unknown>[] = []
  const admin = {
    from(table: string) {
      if (table === 'tenancy_documents') {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updates.push(patch)
              return { error: null }
            },
          }),
        }
      }
      if (table === 'tenancies') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { booking_id: 'book-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'book-1', landlord_id: 'll-1', student_id: 'st-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploads.push(path)
          return { error: null }
        },
        createSignedUrl: async () => ({ data: { signedUrl: 'https://files.example/signed.pdf' } }),
      }),
    },
  }
  return { admin, uploads, updates }
}

async function complete(doc: {
  document_type?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const { admin, uploads, updates } = buildAdmin()
  await syncFullySignedDocusealSubmission({
    admin: admin as never,
    docRow: {
      id: 'doc-1',
      tenancy_id: tenancyId,
      document_type: doc.document_type,
      docuseal_submission_id: submissionId,
      metadata: doc.metadata ?? null,
      status: 'sent_for_signing',
      landlord_signed_at: null,
      student_signed_at: null,
      co_tenant_signed_at: null,
      file_path: `${tenancyId}/draft.pdf`,
    },
    submissionId,
    submissionPayload: {
      event_type: 'submission.completed',
      data: { completed_at: '2026-11-12T03:00:00.000Z', status: 'completed' },
    },
  })
  return { uploads, filePath: updates[0]?.file_path }
}

describe('syncFullySignedDocusealSubmission storage and lease charge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.extractCompletedAt.mockReturnValue(null)
    mocks.downloadSignedSubmissionPdfFromDocuseal.mockResolvedValue(Buffer.from('%PDF-1.4'))
    mocks.downloadSignedResidentialTenancyPackagePartsFromDocuseal.mockResolvedValue({
      rta: Buffer.from('%PDF-rta'),
      addendum: Buffer.from('%PDF-add'),
    })
    mocks.chargeListingLeaseOnSigned.mockResolvedValue(undefined)
    mocks.maybeAdvanceListingBookingToActive.mockResolvedValue({ advanced: false, reason: 'wrong_status' })
  })

  it('stores each primary agreement on its own signed path and charges once', async () => {
    const nsw = await complete({
      document_type: 'residential_tenancy',
      metadata: { signing_package: 'residential_tenancy' },
    })
    expect(nsw.uploads).toEqual([
      'ten-1/residential_tenancy/nsw_residential_tenancy_agreement_signed.pdf',
      'ten-1/residential_tenancy/quni_platform_addendum_signed.pdf',
    ])
    expect(nsw.filePath).toBe(nsw.uploads[0])

    const qld = await complete({
      document_type: 'residential_tenancy',
      metadata: { signing_package: 'residential_tenancy_qld' },
    })
    expect(qld.uploads[0]).toBe('ten-1/residential_tenancy/qld_form18a_general_tenancy_agreement_signed.pdf')
    expect(qld.uploads[1]).toBe('ten-1/residential_tenancy/quni_platform_addendum_signed.pdf')

    const vic = await complete({
      document_type: 'residential_tenancy',
      metadata: { signing_package: 'residential_tenancy_vic' },
    })
    expect(vic.uploads[0]).toBe('ten-1/residential_tenancy/vic_residential_rental_agreement_signed.pdf')

    const occupancy = await complete({ document_type: 'lease', metadata: {} })
    expect(occupancy.uploads).toEqual(['ten-1/lease/lease_signed.pdf'])

    const formR18 = await complete({
      document_type: 'residential_tenancy',
      metadata: { signing_package: 'rooming_accommodation_qld' },
    })
    expect(formR18.uploads).toEqual(['ten-1/lease/lease_signed.pdf'])

    expect(mocks.chargeListingLeaseOnSigned).toHaveBeenCalledTimes(5)
    expect(mocks.maybeAdvanceListingBookingToActive).toHaveBeenCalledTimes(5)
    for (const call of mocks.chargeListingLeaseOnSigned.mock.calls) {
      expect(call[1]).toBe('book-1')
    }
  })

  it('stores a combined package on the agreement path when DocuSeal returns one file', async () => {
    mocks.downloadSignedResidentialTenancyPackagePartsFromDocuseal.mockResolvedValue(null)
    const combined = await complete({
      document_type: 'residential_tenancy',
      metadata: { signing_package: 'residential_tenancy' },
    })
    expect(combined.uploads).toEqual([
      'ten-1/residential_tenancy/residential_tenancy_agreement_and_addendum_signed.pdf',
    ])
    expect(combined.uploads[0]).not.toContain('/lease/')
    expect(mocks.chargeListingLeaseOnSigned).toHaveBeenCalledTimes(1)
  })

  it('stores non-lease submissions off the lease path and does not charge', async () => {
    const corrected = await complete({
      document_type: 'other',
      metadata: { document_kind: 'corrected_payee_addendum', signing_package: 'residential_tenancy' },
    })
    expect(corrected.uploads).toEqual(['ten-1/corrected_payee_addendum/174_signed.pdf'])
    expect(corrected.filePath).toBe(corrected.uploads[0])

    const mutual = await complete({
      document_type: 'mutual_termination',
      metadata: { kind: 'mutual_surrender' },
    })
    expect(mutual.uploads).toEqual(['ten-1/mutual_termination/mutual_termination_signed.pdf'])

    const bond = await complete({ document_type: 'bond_receipt', metadata: {} })
    expect(bond.uploads).toEqual(['ten-1/bond_receipt/174_signed.pdf'])

    const condition = await complete({ document_type: 'condition_report_ingoing', metadata: {} })
    expect(condition.uploads).toEqual(['ten-1/condition_report_ingoing/174_signed.pdf'])

    const breach = await complete({ document_type: 'breach_notice', metadata: {} })
    expect(breach.uploads).toEqual(['ten-1/breach_notice/174_signed.pdf'])

    const termination = await complete({ document_type: 'termination_notice', metadata: {} })
    expect(termination.uploads).toEqual(['ten-1/termination_notice/174_signed.pdf'])

    const rentIncrease = await complete({ document_type: 'rent_increase_notice', metadata: {} })
    expect(rentIncrease.uploads).toEqual(['ten-1/rent_increase_notice/174_signed.pdf'])

    const bondLodgement = await complete({ document_type: 'bond_lodgement', metadata: {} })
    expect(bondLodgement.uploads).toEqual(['ten-1/bond_lodgement/174_signed.pdf'])

    const plainOther = await complete({ document_type: 'other', metadata: {} })
    expect(plainOther.uploads).toEqual(['ten-1/other/174_signed.pdf'])

    for (const path of [
      corrected,
      mutual,
      bond,
      condition,
      breach,
      termination,
      rentIncrease,
      bondLodgement,
      plainOther,
    ].flatMap((row) => row.uploads)) {
      expect(path.includes('/lease/')).toBe(false)
      expect(path.includes('/residential_tenancy/')).toBe(false)
    }
    expect(mocks.chargeListingLeaseOnSigned).not.toHaveBeenCalled()
    expect(mocks.maybeAdvanceListingBookingToActive).not.toHaveBeenCalled()
  })
})
