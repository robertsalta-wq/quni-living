import { describe, expect, it } from 'vitest'
import { agreementSignaturePrompt } from './agreementSignaturePrompt'

describe('agreementSignaturePrompt', () => {
  it('asks only the party who has not signed', () => {
    expect(
      agreementSignaturePrompt({
        viewer: 'landlord',
        landlordSignedAt: null,
        studentSignedAt: null,
        signingUrl: 'https://quni.com.au/api/sign/1',
      }).title,
    ).toBe('Agreement waiting for your signature')
    expect(
      agreementSignaturePrompt({
        viewer: 'student',
        landlordSignedAt: null,
        studentSignedAt: '2026-11-11T00:00:00Z',
        signingUrl: 'https://quni.com.au/api/sign/2',
      }).title,
    ).toBe('Waiting for the other party to sign')
  })

  it('clears once both have signed', () => {
    expect(
      agreementSignaturePrompt({
        viewer: 'landlord',
        landlordSignedAt: '2026-11-11T00:00:00Z',
        studentSignedAt: '2026-11-11T00:00:00Z',
        signingUrl: 'https://quni.com.au/api/sign/1',
      }).kind,
    ).toBe('none')
  })
})
