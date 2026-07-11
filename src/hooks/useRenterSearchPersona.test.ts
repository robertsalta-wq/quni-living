import { describe, expect, it } from 'vitest'
import { renterSearchPersonaFromRoute } from './useRenterSearchPersona'

describe('renterSearchPersonaFromRoute', () => {
  it('returns guest when not a student role', () => {
    expect(renterSearchPersonaFromRoute(null, null)).toBe('guest')
    expect(renterSearchPersonaFromRoute('landlord', 'non_student')).toBe('guest')
  })

  it('returns professional for non_student route', () => {
    expect(renterSearchPersonaFromRoute('renter', 'non_student')).toBe('professional')
    expect(renterSearchPersonaFromRoute('renter', 'identity')).toBe('professional')
  })

  it('returns student for student route', () => {
    expect(renterSearchPersonaFromRoute('renter', 'student')).toBe('student')
    expect(renterSearchPersonaFromRoute('renter', null)).toBe('student')
  })
})
