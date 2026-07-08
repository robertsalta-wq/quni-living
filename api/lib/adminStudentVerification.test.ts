import { describe, expect, it } from 'vitest'
import {
  buildAdminVerificationPatch,
  buildLegalNameLockPatch,
  parseAdminVerificationLegalNames,
} from './adminStudentVerification.js'

describe('parseAdminVerificationLegalNames', () => {
  it('requires legal names for id_document verify', () => {
    expect(parseAdminVerificationLegalNames('id_document', 'verify', undefined, undefined)).toEqual({
      ok: false,
      error: 'legalFirstName and legalLastName are required when verifying Photo ID',
      status: 400,
    })
    expect(parseAdminVerificationLegalNames('id_document', 'verify', 'Ada', undefined)).toEqual({
      ok: false,
      error: 'legalFirstName and legalLastName are required when verifying Photo ID',
      status: 400,
    })
  })

  it('rejects empty or whitespace-only legal names on id_document verify', () => {
    expect(parseAdminVerificationLegalNames('id_document', 'verify', '  ', 'Lovelace')).toEqual({
      ok: false,
      error: 'legalFirstName and legalLastName are required when verifying Photo ID',
      status: 400,
    })
    expect(parseAdminVerificationLegalNames('id_document', 'verify', 'Ada', '\t')).toEqual({
      ok: false,
      error: 'legalFirstName and legalLastName are required when verifying Photo ID',
      status: 400,
    })
  })

  it('rejects legal names longer than 100 characters', () => {
    const tooLong = 'a'.repeat(101)
    expect(parseAdminVerificationLegalNames('id_document', 'verify', tooLong, 'Lovelace')).toEqual({
      ok: false,
      error: 'legalFirstName and legalLastName must be at most 100 characters',
      status: 400,
    })
  })

  it('accepts trimmed legal names for id_document verify', () => {
    expect(
      parseAdminVerificationLegalNames('id_document', 'verify', '  Ada  ', '  Lovelace '),
    ).toEqual({
      ok: true,
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
  })

  it('ignores legal names for enrolment_doc verify', () => {
    expect(
      parseAdminVerificationLegalNames('enrolment_doc', 'verify', undefined, undefined),
    ).toEqual({ ok: true })
  })

  it('ignores legal names for id_document clear and in_review', () => {
    expect(parseAdminVerificationLegalNames('id_document', 'clear', undefined, undefined)).toEqual({
      ok: true,
    })
    expect(
      parseAdminVerificationLegalNames('id_document', 'in_review', undefined, undefined),
    ).toEqual({ ok: true })
  })
})

describe('id_document verify update patch', () => {
  const now = '2026-07-08T12:00:00.000Z'
  const adminUserId = 'admin-user-1'

  it('includes verified timestamp plus legal name lock fields', () => {
    const legal = parseAdminVerificationLegalNames('id_document', 'verify', ' Ada ', ' Lovelace ')
    expect(legal.ok).toBe(true)
    if (!legal.ok || !legal.firstName || !legal.lastName) return

    const updatePatch = {
      ...buildAdminVerificationPatch('id_document', 'verify', now),
      ...buildLegalNameLockPatch(legal.firstName, legal.lastName, now, adminUserId),
    }

    expect(updatePatch).toEqual({
      id_document_verified_at: now,
      id_document_review_status: null,
      first_name: 'Ada',
      last_name: 'Lovelace',
      legal_name_locked_at: now,
      legal_name_set_at: now,
      legal_name_set_by: adminUserId,
    })
  })

  it('does not attach legal name fields for enrolment_doc verify', () => {
    const legal = parseAdminVerificationLegalNames('enrolment_doc', 'verify', undefined, undefined)
    expect(legal.ok).toBe(true)
    expect(buildAdminVerificationPatch('enrolment_doc', 'verify', now)).toEqual({
      enrolment_doc_verified_at: now,
      enrolment_doc_review_status: null,
    })
  })
})
