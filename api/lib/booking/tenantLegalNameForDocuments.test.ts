import { describe, expect, it } from 'vitest'
import {
  legacyStudentNameFromProfile,
  tenantLegalNameForDocuments,
} from './tenantLegalNameForDocuments.js'

describe('tenantLegalNameForDocuments', () => {
  it('returns legacy first+last when unlocked (unchanged from today)', () => {
    const p = { first_name: 'A', last_name: 'B', full_name: 'Legacy Full' }
    expect(tenantLegalNameForDocuments(p)).toBe('A B')
    expect(legacyStudentNameFromProfile(p)).toBe('A B')
  })

  it('falls back to full_name when parts empty', () => {
    const p = { first_name: null, last_name: null, full_name: 'Legacy Full' }
    expect(tenantLegalNameForDocuments(p)).toBe('Legacy Full')
  })

  it('returns locked legal name on document when tenant is locked', () => {
    const p = {
      first_name: 'Legal',
      last_name: 'Name',
      full_name: 'Display Name',
      verification_type: 'identity',
      legal_name_locked_at: '2026-07-01T00:00:00Z',
    }
    expect(tenantLegalNameForDocuments(p)).toBe('Legal Name')
  })
})
