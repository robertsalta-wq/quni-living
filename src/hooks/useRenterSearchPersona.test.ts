import { describe, expect, it } from 'vitest'
import { renterSearchPersonaFromRoute } from './useRenterSearchPersona'

describe('renterSearchPersonaFromRoute', () => {
  it('returns guest when not a student role', () => {
    expect(renterSearchPersonaFromRoute(null, null)).toBe('guest')
    expect(renterSearchPersonaFromRoute('landlord', 'non_student')).toBe('guest')
  })

  it('returns professional for non_student route', () => {
    expect(renterSearchPersonaFromRoute('student', 'non_student')).toBe('professional')
    expect(renterSearchPersonaFromRoute('student', 'identity')).toBe('professional')
  })

  it('returns student for student route', () => {
    expect(renterSearchPersonaFromRoute('student', 'student')).toBe('student')
    expect(renterSearchPersonaFromRoute('student', null)).toBe('student')
  })
})
