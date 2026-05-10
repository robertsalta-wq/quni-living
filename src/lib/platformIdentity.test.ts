import { describe, expect, it } from 'vitest'
import {
  buildPlatformIdentificationLine,
  DEFAULT_PLATFORM_LEGAL_NAME,
  formatAustralianAbn,
  resolvePlatformLegalEntityName,
} from './platformIdentity.js'

describe('formatAustralianAbn', () => {
  it('formats 11-digit ABN with spaces', () => {
    expect(formatAustralianAbn('51824753556')).toBe('51 824 753 556')
  })

  it('passes through non-11-digit strings trimmed', () => {
    expect(formatAustralianAbn(' 12 345 ')).toBe('12 345')
  })
})

describe('buildPlatformIdentificationLine', () => {
  it('returns null when all empty', () => {
    expect(buildPlatformIdentificationLine({})).toBeNull()
  })

  it('joins present fields', () => {
    expect(
      buildPlatformIdentificationLine({
        abn: '51824753556',
        acn: '123 456 789',
        directorName: 'Jane Example',
      }),
    ).toBe('ABN 51 824 753 556 · ACN 123 456 789 · Director: Jane Example')
  })
})

describe('resolvePlatformLegalEntityName', () => {
  it('defaults when blank', () => {
    expect(resolvePlatformLegalEntityName('')).toBe(DEFAULT_PLATFORM_LEGAL_NAME)
    expect(resolvePlatformLegalEntityName(null)).toBe(DEFAULT_PLATFORM_LEGAL_NAME)
  })

  it('uses provided name', () => {
    expect(resolvePlatformLegalEntityName('  Acme Co Pty Ltd  ')).toBe('Acme Co Pty Ltd')
  })
})
