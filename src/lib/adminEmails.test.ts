import { describe, expect, it } from 'vitest'
import { authUserEmail } from './adminEmails'

describe('authUserEmail', () => {
  it('prefers user.email (trimmed)', () => {
    expect(authUserEmail({ email: '  a@b.com ' } as never)).toBe('a@b.com')
  })

  it('falls back to identities email when user.email is empty', () => {
    expect(
      authUserEmail({ email: '', identities: [{ identity_data: { email: 'c@d.com' } }] } as never),
    ).toBe('c@d.com')
  })

  it('returns null when no email is present', () => {
    expect(authUserEmail(null)).toBeNull()
    expect(authUserEmail({ email: '', identities: [] } as never)).toBeNull()
  })
})
