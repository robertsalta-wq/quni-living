import type { Database } from './database.types'
import type { StudentProfileRow } from './studentOnboarding'
import type { VerificationDocRowKind } from './verificationItemState'
import { isStudentUniEmailVerified } from './studentUniEmailVerification'

export type AdminVerificationItem =
  | 'id_document'
  | 'enrolment_doc'
  | 'identity_supporting_doc'
  | 'visa_doc'
  | 'uni_email'
  | 'work_email'

export type AdminVerificationAction = 'verify' | 'in_review' | 'clear'

export type VerificationItemDisplayState =
  | { kind: 'not_applicable' }
  | { kind: 'not_submitted' }
  | { kind: 'submitted' }
  | { kind: 'in_review' }
  | { kind: 'verified'; at: string }

type DocItem = Exclude<AdminVerificationItem, 'uni_email' | 'work_email'>

function adminItemToDocKind(item: DocItem): VerificationDocRowKind {
  if (item === 'id_document') return 'id'
  if (item === 'enrolment_doc') return 'enrolment'
  if (item === 'visa_doc') return 'visa'
  return 'identity_supporting'
}

function docOnFile(profile: StudentProfileRow, item: DocItem): boolean {
  const kind = adminItemToDocKind(item)
  const { url, submittedAt } = (() => {
    if (kind === 'id') {
      return { url: profile.id_document_url, submittedAt: profile.id_submitted_at }
    }
    if (kind === 'enrolment') {
      return { url: profile.enrolment_doc_url, submittedAt: profile.enrolment_submitted_at }
    }
    if (kind === 'visa') {
      return { url: profile.visa_doc_url, submittedAt: profile.visa_submitted_at }
    }
    return {
      url: profile.identity_supporting_doc_url,
      submittedAt: profile.identity_supporting_submitted_at,
    }
  })()
  return Boolean(url?.trim() && submittedAt?.trim())
}

function docFields(profile: StudentProfileRow, item: DocItem) {
  switch (item) {
    case 'id_document':
      return {
        verifiedAt: profile.id_document_verified_at,
        reviewStatus: profile.id_document_review_status,
        url: profile.id_document_url,
        submittedAt: profile.id_submitted_at,
      }
    case 'enrolment_doc':
      return {
        verifiedAt: profile.enrolment_doc_verified_at,
        reviewStatus: profile.enrolment_doc_review_status,
        url: profile.enrolment_doc_url,
        submittedAt: profile.enrolment_submitted_at,
      }
    case 'identity_supporting_doc':
      return {
        verifiedAt: profile.identity_supporting_doc_verified_at,
        reviewStatus: profile.identity_supporting_doc_review_status,
        url: profile.identity_supporting_doc_url,
        submittedAt: profile.identity_supporting_submitted_at,
      }
    case 'visa_doc':
      return {
        verifiedAt: profile.visa_doc_verified_at,
        reviewStatus: profile.visa_doc_review_status,
        url: profile.visa_doc_url,
        submittedAt: profile.visa_submitted_at,
      }
  }
}

export function adminVerificationItemSupportsInReview(item: AdminVerificationItem): boolean {
  return item !== 'uni_email' && item !== 'work_email'
}

export function getVerificationItemDisplayState(
  profile: StudentProfileRow,
  item: AdminVerificationItem,
): VerificationItemDisplayState {
  if (item === 'uni_email') {
    if (!profile.uni_email?.trim()) return { kind: 'not_applicable' }
    if (isStudentUniEmailVerified(profile) && profile.uni_email_verified_at) {
      return { kind: 'verified', at: profile.uni_email_verified_at }
    }
    if (isStudentUniEmailVerified(profile)) {
      return { kind: 'verified', at: new Date(0).toISOString() }
    }
    return { kind: 'submitted' }
  }

  if (item === 'work_email') {
    if (!profile.work_email?.trim()) return { kind: 'not_applicable' }
    if (profile.work_email_verified && profile.work_email_verified_at) {
      return { kind: 'verified', at: profile.work_email_verified_at }
    }
    if (profile.work_email_verified) {
      return { kind: 'verified', at: new Date(0).toISOString() }
    }
    return { kind: 'submitted' }
  }

  if (!docOnFile(profile, item)) return { kind: 'not_submitted' }
  const { verifiedAt, reviewStatus } = docFields(profile, item)
  if (verifiedAt) return { kind: 'verified', at: verifiedAt }
  if (reviewStatus === 'in_review') return { kind: 'in_review' }
  return { kind: 'submitted' }
}

export function verificationItemDisplayLabel(state: VerificationItemDisplayState): string {
  switch (state.kind) {
    case 'not_applicable':
      return 'Not provided'
    case 'not_submitted':
      return 'Not submitted'
    case 'submitted':
      return 'Submitted'
    case 'in_review':
      return 'In review'
    case 'verified':
      return 'Verified'
  }
}

/** Column patch for a staff verification action (does not include verification_type). */
export function buildAdminVerificationPatch(
  item: AdminVerificationItem,
  action: AdminVerificationAction,
  nowIso: string,
): Database['public']['Tables']['student_profiles']['Update'] {
  if (item === 'uni_email') {
    if (action === 'verify') {
      return { uni_email_verified: true, uni_email_verified_at: nowIso }
    }
    return { uni_email_verified: false, uni_email_verified_at: null }
  }

  if (item === 'work_email') {
    if (action === 'verify') {
      return { work_email_verified: true, work_email_verified_at: nowIso }
    }
    return { work_email_verified: false, work_email_verified_at: null }
  }

  const verifiedKey = {
    id_document: 'id_document_verified_at',
    enrolment_doc: 'enrolment_doc_verified_at',
    identity_supporting_doc: 'identity_supporting_doc_verified_at',
    visa_doc: 'visa_doc_verified_at',
  } as const

  const reviewKey = {
    id_document: 'id_document_review_status',
    enrolment_doc: 'enrolment_doc_review_status',
    identity_supporting_doc: 'identity_supporting_doc_review_status',
    visa_doc: 'visa_doc_review_status',
  } as const

  if (action === 'verify') {
    return {
      [verifiedKey[item]]: nowIso,
      [reviewKey[item]]: null,
    }
  }
  if (action === 'in_review') {
    return {
      [verifiedKey[item]]: null,
      [reviewKey[item]]: 'in_review',
    }
  }
  return {
    [verifiedKey[item]]: null,
    [reviewKey[item]]: null,
  }
}

export function parseAdminVerificationItem(raw: unknown): AdminVerificationItem | null {
  if (
    raw === 'id_document' ||
    raw === 'enrolment_doc' ||
    raw === 'identity_supporting_doc' ||
    raw === 'visa_doc' ||
    raw === 'uni_email' ||
    raw === 'work_email'
  ) {
    return raw
  }
  return null
}

export function parseAdminVerificationAction(raw: unknown): AdminVerificationAction | null {
  if (raw === 'verify' || raw === 'in_review' || raw === 'clear') return raw
  return null
}
