/**
 * Server mirror of src/lib/adminStudentVerification.ts — keep patch builders in sync.
 */

/** @typedef {'id_document' | 'enrolment_doc' | 'identity_supporting_doc' | 'visa_doc' | 'uni_email' | 'work_email'} AdminVerificationItem */
/** @typedef {'verify' | 'in_review' | 'clear'} AdminVerificationAction */

/**
 * @param {unknown} raw
 * @returns {AdminVerificationItem | null}
 */
export function parseAdminVerificationItem(raw) {
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

/**
 * @param {unknown} raw
 * @returns {AdminVerificationAction | null}
 */
export function parseAdminVerificationAction(raw) {
  if (raw === 'verify' || raw === 'in_review' || raw === 'clear') return raw
  return null
}

/**
 * @param {AdminVerificationItem} item
 * @returns {boolean}
 */
export function adminVerificationItemSupportsInReview(item) {
  return item !== 'uni_email' && item !== 'work_email'
}

/**
 * @param {AdminVerificationItem} item
 * @param {AdminVerificationAction} action
 * @param {string} nowIso
 */
export function buildAdminVerificationPatch(item, action, nowIso) {
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
  }

  const reviewKey = {
    id_document: 'id_document_review_status',
    enrolment_doc: 'enrolment_doc_review_status',
    identity_supporting_doc: 'identity_supporting_doc_review_status',
    visa_doc: 'visa_doc_review_status',
  }

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
