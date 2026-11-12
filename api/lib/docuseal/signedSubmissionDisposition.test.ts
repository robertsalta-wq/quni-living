import { describe, expect, it } from 'vitest'
import {
  completionDisposition,
  correctedPayeeAddendumSignedPath,
  isLeaseOrSignedAgreementPath,
  nonLeaseSignedPath,
  platformAddendumSignedPath,
  primaryLeaseSignedPath,
  residentialAgreementSignedPath,
} from './signedSubmissionDisposition.js'

const tenancyId = 'ten-1'

describe('completionDisposition', () => {
  it('classifies every submission type that can reach completion', () => {
    const cases: Array<{
      name: string
      doc: { document_type?: string | null; metadata?: Record<string, unknown> | null }
      kind: string
      charge: boolean
      email: string
    }> = [
      {
        name: 'NSW residential package',
        doc: { document_type: 'residential_tenancy', metadata: { signing_package: 'residential_tenancy' } },
        kind: 'residential_package',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'QLD Form 18a package',
        doc: { document_type: 'residential_tenancy', metadata: { signing_package: 'residential_tenancy_qld' } },
        kind: 'residential_package',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'VIC Form 1 package',
        doc: { document_type: 'residential_tenancy', metadata: { signing_package: 'residential_tenancy_vic' } },
        kind: 'residential_package',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'QLD Form R18',
        doc: { document_type: 'residential_tenancy', metadata: { signing_package: 'rooming_accommodation_qld' } },
        kind: 'primary_lease',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'occupancy or boarding-house lease',
        doc: { document_type: 'lease', metadata: { docuseal_response: {} } },
        kind: 'primary_lease',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'legacy lease row without document_type',
        doc: { metadata: null },
        kind: 'primary_lease',
        charge: true,
        email: 'primary_agreement',
      },
      {
        name: 'mutual termination',
        doc: { document_type: 'mutual_termination', metadata: { kind: 'mutual_surrender' } },
        kind: 'mutual_termination',
        charge: false,
        email: 'mutual_termination',
      },
      {
        name: 'corrected payee addendum',
        doc: { document_type: 'other', metadata: { document_kind: 'corrected_payee_addendum' } },
        kind: 'corrected_payee_addendum',
        charge: false,
        email: 'corrected_payee_addendum',
      },
      {
        name: 'corrected addendum even if a lease package flag is also present',
        doc: {
          document_type: 'other',
          metadata: { document_kind: 'corrected_payee_addendum', signing_package: 'residential_tenancy' },
        },
        kind: 'corrected_payee_addendum',
        charge: false,
        email: 'corrected_payee_addendum',
      },
      {
        name: 'bond receipt',
        doc: { document_type: 'bond_receipt', metadata: {} },
        kind: 'other',
        charge: false,
        email: 'none',
      },
      {
        name: 'condition report',
        doc: { document_type: 'condition_report_ingoing', metadata: {} },
        kind: 'other',
        charge: false,
        email: 'none',
      },
    ]

    for (const row of cases) {
      expect(completionDisposition(row.doc), row.name).toEqual({
        kind: row.kind,
        runsLeaseCharge: row.charge,
        email: row.email,
      })
    }
  })

  it('keeps corrected and other files off lease and agreement paths', () => {
    const corrected = correctedPayeeAddendumSignedPath(tenancyId, '174')
    const bond = nonLeaseSignedPath(tenancyId, 'bond_receipt', '174')
    expect(corrected).toBe('ten-1/corrected_payee_addendum/174_signed.pdf')
    expect(bond).toBe('ten-1/bond_receipt/174_signed.pdf')
    expect(isLeaseOrSignedAgreementPath(corrected)).toBe(false)
    expect(isLeaseOrSignedAgreementPath(bond)).toBe(false)
    expect(isLeaseOrSignedAgreementPath(primaryLeaseSignedPath(tenancyId))).toBe(true)
    expect(isLeaseOrSignedAgreementPath(residentialAgreementSignedPath(tenancyId, 'residential_tenancy'))).toBe(true)
    expect(isLeaseOrSignedAgreementPath(platformAddendumSignedPath(tenancyId))).toBe(true)
  })
})
