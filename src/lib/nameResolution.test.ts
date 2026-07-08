import { describe, expect, it } from 'vitest'
import {
  landlordDisplayName,
  landlordLegalName,
  landlordLegalNameReady,
  studentDisplayName,
  studentLegalName,
  studentLegalNameReady,
  type NameProfile,
} from './nameResolution'

describe('studentLegalName', () => {
  it('returns first+last when locked, identity-verified, and both names set', () => {
    const p: NameProfile = {
      first_name: 'Han',
      last_name: 'Nguyen',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBe('Han Nguyen')
    expect(studentLegalNameReady(p)).toBe(true)
  })

  it('returns null when locked but verification_type is not identity', () => {
    const p: NameProfile = {
      first_name: 'Han',
      last_name: 'Nguyen',
      verification_type: 'student',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBeNull()
    expect(studentLegalNameReady(p)).toBe(false)
  })

  it('returns null when not locked', () => {
    const p: NameProfile = {
      first_name: 'Han',
      last_name: 'Nguyen',
      verification_type: 'identity',
      legal_name_locked_at: null,
    }
    expect(studentLegalName(p)).toBeNull()
  })

  it('returns null when locked+identity but last_name empty', () => {
    const p: NameProfile = {
      first_name: 'Han',
      last_name: '',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBeNull()
  })

  it('returns null for whitespace-only names', () => {
    const p: NameProfile = {
      first_name: '  ',
      last_name: '  ',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBeNull()
  })

  it('never falls back to full_name', () => {
    const p: NameProfile = {
      first_name: null,
      last_name: null,
      full_name: 'Julia Smith',
      preferred_name: 'Julia',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBeNull()
  })

  it('trims names before joining', () => {
    const p: NameProfile = {
      first_name: '  Han  ',
      last_name: '  Nguyen  ',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(studentLegalName(p)).toBe('Han Nguyen')
  })
})

describe('landlordLegalName', () => {
  it('returns first+last when locked individual with both names', () => {
    const p: NameProfile = {
      first_name: 'Pat',
      last_name: 'Lee',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(landlordLegalName(p)).toBe('Pat Lee')
    expect(landlordLegalNameReady(p)).toBe(true)
  })

  it('returns null when locked but company_name present', () => {
    const p: NameProfile = {
      first_name: 'Pat',
      last_name: 'Lee',
      company_name: 'Acme Pty Ltd',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(landlordLegalName(p)).toBeNull()
    expect(landlordLegalNameReady(p)).toBe(false)
  })

  it('returns null when not locked', () => {
    const p: NameProfile = {
      first_name: 'Pat',
      last_name: 'Lee',
      legal_name_locked_at: null,
    }
    expect(landlordLegalName(p)).toBeNull()
  })

  it('never falls back to full_name', () => {
    const p: NameProfile = {
      first_name: null,
      last_name: null,
      full_name: 'Pat Lee',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(landlordLegalName(p)).toBeNull()
  })
})

describe('studentDisplayName', () => {
  it('prefers preferred_name over full_name', () => {
    expect(
      studentDisplayName({
        preferred_name: 'Julia',
        full_name: 'Han Nguyen',
        first_name: 'Han',
        last_name: 'Nguyen',
      }),
    ).toBe('Julia')
  })

  it('falls back full_name then first+last then Student', () => {
    expect(studentDisplayName({ full_name: 'Han Nguyen' })).toBe('Han Nguyen')
    expect(studentDisplayName({ first_name: 'Han', last_name: 'Nguyen' })).toBe('Han Nguyen')
    expect(studentDisplayName({})).toBe('Student')
  })

  it('skips whitespace preferred_name', () => {
    expect(
      studentDisplayName({
        preferred_name: '   ',
        full_name: 'Han Nguyen',
      }),
    ).toBe('Han Nguyen')
  })

  it('joins first+last without trailing space when last missing', () => {
    expect(studentDisplayName({ first_name: 'Han' })).toBe('Han')
  })
})

describe('landlordDisplayName', () => {
  it('prefers full_name', () => {
    expect(
      landlordDisplayName({
        full_name: 'Pat Lee',
        company_name: 'Acme',
        first_name: 'Pat',
        last_name: 'Lee',
      }),
    ).toBe('Pat Lee')
  })

  it('falls back company_name then first+last then Landlord', () => {
    expect(landlordDisplayName({ company_name: 'Acme Pty Ltd' })).toBe('Acme Pty Ltd')
    expect(landlordDisplayName({ first_name: 'Pat', last_name: 'Lee' })).toBe('Pat Lee')
    expect(landlordDisplayName({})).toBe('Landlord')
  })
})
