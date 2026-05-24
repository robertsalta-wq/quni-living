import { describe, expect, it } from 'vitest'
import { isLegacyMetadataAdmin } from './adminEmails'

describe('isLegacyMetadataAdmin', () => {
  it('returns true when user_metadata.role is admin', () => {
    expect(isLegacyMetadataAdmin({ user_metadata: { role: 'admin' } } as never)).toBe(true)
  })

  it('returns false otherwise', () => {
    expect(isLegacyMetadataAdmin({ user_metadata: { role: 'landlord' } } as never)).toBe(false)
    expect(isLegacyMetadataAdmin(null)).toBe(false)
  })
})
