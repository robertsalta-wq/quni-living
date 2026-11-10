import { describe, expect, it } from 'vitest'

import {
  UNI_DOMAIN_REQUEST_EMAIL,
  isAllowedUniEmailDomain,
  uniEmailDomainErrorMessage,
  uniEmailRejection,
} from './uniEmailDomains'

const ACCEPTED = [
  'you@student.unsw.edu.au',
  'name@student.usc.edu.au',
  'id@myacu.edu.au',
  'user@myune.edu.au',
  'staff@une.edu.au',
  'name@griffithuni.edu.au',
  'name@uowmail.edu.au',
  'name@cqumail.com',
  's1234567@student.avondale.edu.au',
  'name@unisq.edu.au',
  'u123456@umail.usq.edu.au',
  'first.last@student.adelaide.edu.au',
  'name@mymail.unisa.edu.au',
  'you@student.monash.edu',
]

describe('uni email domains', () => {
  it.each(ACCEPTED)('accepts %s', (email) => {
    expect(uniEmailRejection(email)).toBeNull()
    expect(isAllowedUniEmailDomain(email.split('@')[1] ?? '')).toBe(true)
  })

  it('rejects a domain that only looks like a listed suffix', () => {
    expect(isAllowedUniEmailDomain('usc.edu.au.evil.com')).toBe(false)
    expect(isAllowedUniEmailDomain('notusc.edu.au')).toBe(false)
    expect(uniEmailRejection('a@usc.edu.au.evil.com')?.reason).toBe('unrecognised')
    expect(uniEmailRejection('a@notusc.edu.au')?.reason).toBe('unrecognised')
  })

  it('asks free providers for a university address', () => {
    const gmail = uniEmailRejection('me@gmail.com')
    const outlook = uniEmailRejection('me@outlook.com')
    expect(gmail).toEqual({
      reason: 'free_provider',
      message: uniEmailDomainErrorMessage(),
    })
    expect(outlook?.reason).toBe('free_provider')
    expect(gmail?.message.includes(UNI_DOMAIN_REQUEST_EMAIL)).toBe(false)
  })

  it('points an unrecognised domain at the request inbox', () => {
    const result = uniEmailRejection('me@notauser.edu.au')
    expect(result?.reason).toBe('unrecognised')
    expect(result?.message).toBe(
      `We don't recognise this university email yet. Email ${UNI_DOMAIN_REQUEST_EMAIL} from this address and we'll add it.`,
    )
  })

  it('rejects an address that is not an email', () => {
    expect(uniEmailRejection('not-an-email')).toEqual({
      reason: 'invalid',
      message: 'Enter a valid email address.',
    })
    expect(uniEmailRejection('a@')).toEqual({
      reason: 'invalid',
      message: 'Enter a valid email address.',
    })
  })
})
