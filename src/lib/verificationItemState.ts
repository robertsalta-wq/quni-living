import type { Database } from './database.types'
import type { VerificationDocKind } from './verificationDocSlot'
import { isStudentUniEmailVerified } from './studentUniEmailVerification'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

/** §02 universal docs plus §03 visa document row. */
export type VerificationDocRowKind = VerificationDocKind | 'visa'

export type VerificationItemRightSlot =
  | { kind: 'action'; action: 'replace' | 'edit' }
  | { kind: 'verified' }
  | { kind: 'in_review' }

export type VerificationEmailKind = 'uni' | 'work'

function docFields(profile: StudentRow, kind: VerificationDocRowKind) {
  if (kind === 'id') {
    return {
      verifiedAt: profile.id_document_verified_at,
      reviewStatus: profile.id_document_review_status,
      url: profile.id_document_url,
      submittedAt: profile.id_submitted_at,
    }
  }
  if (kind === 'enrolment') {
    return {
      verifiedAt: profile.enrolment_doc_verified_at,
      reviewStatus: profile.enrolment_doc_review_status,
      url: profile.enrolment_doc_url,
      submittedAt: profile.enrolment_submitted_at,
    }
  }
  if (kind === 'visa') {
    return {
      verifiedAt: profile.visa_doc_verified_at,
      reviewStatus: profile.visa_doc_review_status,
      url: profile.visa_doc_url,
      submittedAt: profile.visa_submitted_at,
    }
  }
  return {
    verifiedAt: profile.identity_supporting_doc_verified_at,
    reviewStatus: profile.identity_supporting_doc_review_status,
    url: profile.identity_supporting_doc_url,
    submittedAt: profile.identity_supporting_submitted_at,
  }
}

export function verificationDocOnFile(profile: StudentRow, kind: VerificationDocRowKind): boolean {
  const { url, submittedAt } = docFields(profile, kind)
  return Boolean(url?.trim() && submittedAt?.trim())
}

/** Right slot for a completed document row; null when no file on record. */
export function verificationDocRowSlot(
  profile: StudentRow,
  kind: VerificationDocRowKind,
): VerificationItemRightSlot | null {
  if (!verificationDocOnFile(profile, kind)) return null
  const { verifiedAt, reviewStatus } = docFields(profile, kind)
  if (verifiedAt) return { kind: 'verified' }
  if (reviewStatus === 'in_review') return { kind: 'in_review' }
  return { kind: 'action', action: 'replace' }
}

export function verificationDocReplaceAllowed(
  profile: StudentRow,
  kind: VerificationDocRowKind,
): boolean {
  const slot = verificationDocRowSlot(profile, kind)
  return slot?.kind === 'action' && slot.action === 'replace'
}

/** Email rows: verified badge when OTP complete; otherwise parent shows the input form. */
export function verificationEmailRowSlot(
  profile: StudentRow,
  kind: VerificationEmailKind,
): VerificationItemRightSlot | null {
  if (kind === 'uni') {
    if (!profile.uni_email?.trim()) return null
    return isStudentUniEmailVerified(profile) ? { kind: 'verified' } : { kind: 'action', action: 'edit' }
  }
  if (!profile.work_email?.trim()) return null
  return profile.work_email_verified ? { kind: 'verified' } : { kind: 'action', action: 'edit' }
}

export function verificationEmailVerified(profile: StudentRow, kind: VerificationEmailKind): boolean {
  return verificationEmailRowSlot(profile, kind)?.kind === 'verified'
}
