import { describe, expect, it } from 'vitest'
import type { Database } from './database.types'
import {
  verificationDocReplaceAllowed,
  verificationDocRowSlot,
  verificationEmailRowSlot,
} from './verificationItemState'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

function profile(overrides: Partial<StudentRow> = {}): StudentRow {
  return {
    user_id: 'user-1',
    id_document_url: null,
    id_submitted_at: null,
    ...overrides,
  } as StudentRow
}

describe('verificationDocRowSlot', () => {
  const onFile = profile({
    id_document_url: 'user/id.pdf',
    id_submitted_at: '2026-06-01T00:00:00Z',
  })

  it('returns replace when uploaded and not yet verified', () => {
    expect(verificationDocRowSlot(onFile, 'id')).toEqual({ kind: 'action', action: 'replace' })
    expect(verificationDocReplaceAllowed(onFile, 'id')).toBe(true)
  })

  it('returns verified when staff verified the document', () => {
    const verified = profile({
      ...onFile,
      id_document_verified_at: '2026-06-02T00:00:00Z',
    })
    expect(verificationDocRowSlot(verified, 'id')).toEqual({ kind: 'verified' })
    expect(verificationDocReplaceAllowed(verified, 'id')).toBe(false)
  })

  it('returns in review when review status is set', () => {
    const reviewing = profile({
      ...onFile,
      id_document_review_status: 'in_review',
    })
    expect(verificationDocRowSlot(reviewing, 'id')).toEqual({ kind: 'in_review' })
    expect(verificationDocReplaceAllowed(reviewing, 'id')).toBe(false)
  })

  it('verified takes precedence over in_review', () => {
    const both = profile({
      ...onFile,
      id_document_verified_at: '2026-06-02T00:00:00Z',
      id_document_review_status: 'in_review',
    })
    expect(verificationDocRowSlot(both, 'id')).toEqual({ kind: 'verified' })
  })

  it('reads visa_doc_verified_at and visa_doc_review_status for visa rows', () => {
    const onFileVisa = profile({
      visa_doc_url: 'visa/user/visa-document.pdf',
      visa_submitted_at: '2026-06-01T00:00:00Z',
    })
    expect(verificationDocRowSlot(onFileVisa, 'visa')).toEqual({ kind: 'action', action: 'replace' })

    const verifiedVisa = profile({
      ...onFileVisa,
      visa_doc_verified_at: '2026-06-02T00:00:00Z',
    })
    expect(verificationDocRowSlot(verifiedVisa, 'visa')).toEqual({ kind: 'verified' })

    const reviewingVisa = profile({
      ...onFileVisa,
      visa_doc_review_status: 'in_review',
    })
    expect(verificationDocRowSlot(reviewingVisa, 'visa')).toEqual({ kind: 'in_review' })
  })
})

describe('verificationEmailRowSlot', () => {
  it('returns verified for confirmed uni email', () => {
    const p = profile({
      uni_email: 'lucy@uni.edu.au',
      uni_email_verified: true,
      uni_email_verified_at: '2026-06-01T00:00:00Z',
    })
    expect(verificationEmailRowSlot(p, 'uni')).toEqual({ kind: 'verified' })
  })

  it('returns edit when uni email is on file but not verified', () => {
    const p = profile({ uni_email: 'lucy@uni.edu.au', uni_email_verified: false })
    expect(verificationEmailRowSlot(p, 'uni')).toEqual({ kind: 'action', action: 'edit' })
  })
})
