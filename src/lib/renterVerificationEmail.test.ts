import { describe, expect, it } from 'vitest'
import {
  situationShowsVerificationEmail,
  verificationEmailFieldLabel,
} from './renterVerificationEmail'

describe('renterVerificationEmail', () => {
  it('shows email only for student and working', () => {
    expect(situationShowsVerificationEmail('student')).toBe(true)
    expect(situationShowsVerificationEmail('working')).toBe(true)
    expect(situationShowsVerificationEmail('retired')).toBe(false)
    expect(situationShowsVerificationEmail('between_jobs')).toBe(false)
    expect(situationShowsVerificationEmail('backpacker')).toBe(false)
    expect(situationShowsVerificationEmail('working_holiday')).toBe(false)
  })

  it('labels email by route', () => {
    expect(verificationEmailFieldLabel('student')).toBe('University email')
    expect(verificationEmailFieldLabel('working')).toBe('Work email')
  })
})
