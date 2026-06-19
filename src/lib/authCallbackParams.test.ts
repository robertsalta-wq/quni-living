import { describe, expect, it } from 'vitest'
import { parseSignupTokenHashFromSearch } from './authCallbackParams'

describe('parseSignupTokenHashFromSearch', () => {
  it('parses signup token_hash params', () => {
    expect(
      parseSignupTokenHashFromSearch('?token_hash=abc123&type=signup'),
    ).toEqual({ token_hash: 'abc123', type: 'signup' })
  })

  it('ignores email type (must stay signup)', () => {
    expect(parseSignupTokenHashFromSearch('?token_hash=abc&type=email')).toBeNull()
  })

  it('ignores missing token_hash', () => {
    expect(parseSignupTokenHashFromSearch('?type=signup')).toBeNull()
  })
})
