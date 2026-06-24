import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import {
  buildAdminVerificationPatch,
  getVerificationItemDisplayState,
  verificationItemDisplayLabel,
} from './adminStudentVerification'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

function profile(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    user_id: 'user-1',
    ...overrides,
  } as StudentRow
}

describe('getVerificationItemDisplayState', () => {
  it('tracks document submitted / in review / verified', () => {
    const onFile = profile({
      id_document_url: 'user/id.pdf',
      id_submitted_at: '2026-06-01T00:00:00Z',
    })
    expect(verificationItemDisplayLabel(getVerificationItemDisplayState(onFile, 'id_document'))).toBe(
      'Submitted',
    )

    const reviewing = profile({
      ...onFile,
      id_document_review_status: 'in_review',
    })
    expect(verificationItemDisplayLabel(getVerificationItemDisplayState(reviewing, 'id_document'))).toBe(
      'In review',
    )

    const verified = profile({
      ...onFile,
      id_document_verified_at: '2026-06-02T00:00:00Z',
    })
    expect(getVerificationItemDisplayState(verified, 'id_document')).toEqual({
      kind: 'verified',
      at: '2026-06-02T00:00:00Z',
    })
  })

  it('tracks uni email submitted vs verified', () => {
    const submitted = profile({ uni_email: 'lucy@uni.edu.au', uni_email_verified: false })
    expect(verificationItemDisplayLabel(getVerificationItemDisplayState(submitted, 'uni_email'))).toBe(
      'Submitted',
    )

    const verified = profile({
      uni_email: 'lucy@uni.edu.au',
      uni_email_verified: true,
      uni_email_verified_at: '2026-06-01T00:00:00Z',
    })
    expect(getVerificationItemDisplayState(verified, 'uni_email')).toEqual({
      kind: 'verified',
      at: '2026-06-01T00:00:00Z',
    })
  })
})

describe('buildAdminVerificationPatch', () => {
  const now = '2026-06-25T12:00:00.000Z'

  it('marks a document verified and clears review', () => {
    expect(buildAdminVerificationPatch('id_document', 'verify', now)).toEqual({
      id_document_verified_at: now,
      id_document_review_status: null,
    })
  })

  it('marks a document in review', () => {
    expect(buildAdminVerificationPatch('visa_doc', 'in_review', now)).toEqual({
      visa_doc_verified_at: null,
      visa_doc_review_status: 'in_review',
    })
  })

  it('clears document verification state', () => {
    expect(buildAdminVerificationPatch('enrolment_doc', 'clear', now)).toEqual({
      enrolment_doc_verified_at: null,
      enrolment_doc_review_status: null,
    })
  })

  it('verifies uni email manually', () => {
    expect(buildAdminVerificationPatch('uni_email', 'verify', now)).toEqual({
      uni_email_verified: true,
      uni_email_verified_at: now,
    })
  })

  it('clears work email verification', () => {
    expect(buildAdminVerificationPatch('work_email', 'clear', now)).toEqual({
      work_email_verified: false,
      work_email_verified_at: null,
    })
  })
})
