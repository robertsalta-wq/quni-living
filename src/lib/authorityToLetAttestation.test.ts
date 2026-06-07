import { describe, expect, it } from 'vitest'
import {
  authorityToLetAttestationPatch,
  propertyHasAuthorityToLetAttestation,
} from './authorityToLetAttestation'

describe('authorityToLetAttestation', () => {
  it('detects attested properties', () => {
    expect(propertyHasAuthorityToLetAttestation({ authority_to_let_attested_at: '2026-06-07T00:00:00.000Z' })).toBe(
      true,
    )
    expect(propertyHasAuthorityToLetAttestation({ authority_to_let_attested_at: null })).toBe(false)
    expect(propertyHasAuthorityToLetAttestation(null)).toBe(false)
  })

  it('sets timestamp only when agreed and not yet attested', () => {
    expect(authorityToLetAttestationPatch({ agreed: false, existingAttestedAt: null })).toEqual({})
    expect(
      authorityToLetAttestationPatch({
        agreed: true,
        existingAttestedAt: '2026-06-07T00:00:00.000Z',
      }),
    ).toEqual({})
    const patch = authorityToLetAttestationPatch({ agreed: true, existingAttestedAt: null })
    expect(patch).toHaveProperty('authority_to_let_attested_at')
    expect(typeof patch.authority_to_let_attested_at).toBe('string')
  })
})
