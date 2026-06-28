import { describe, expect, it } from 'vitest'
import {
  buildLicencePlatformEntityDisplay,
  buildPlatformIdentificationLine,
  DEFAULT_PLATFORM_LEGAL_NAME,
  formatAustralianAbn,
  PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED,
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

describe('buildLicencePlatformEntityDisplay', () => {
  it('throws when legal name is empty (strict)', () => {
    expect(() => buildLicencePlatformEntityDisplay({ legalName: '' })).toThrow(
      PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED,
    )
    expect(() => buildLicencePlatformEntityDisplay({ legalName: null, tradingName: 'Quni Living' })).toThrow(
      PLATFORM_LEGAL_ENTITY_NOT_CONFIGURED,
    )
  })

  it('renders legal name only', () => {
    expect(buildLicencePlatformEntityDisplay({ legalName: 'Quinnvestments Pty Ltd' })).toBe(
      'Quinnvestments Pty Ltd',
    )
  })

  it('renders legal name and ACN as stored', () => {
    expect(
      buildLicencePlatformEntityDisplay({
        legalName: 'Quinnvestments Pty Ltd',
        acn: '675 990 968',
      }),
    ).toBe('Quinnvestments Pty Ltd (ACN 675 990 968)')
  })

  it('renders legal name and trading name', () => {
    expect(
      buildLicencePlatformEntityDisplay({
        legalName: 'Quinnvestments Pty Ltd',
        tradingName: 'Quni Living',
      }),
    ).toBe('Quinnvestments Pty Ltd trading as Quni Living')
  })

  it('renders legal name, ACN, and trading name', () => {
    expect(
      buildLicencePlatformEntityDisplay({
        legalName: 'Quinnvestments Pty Ltd',
        acn: '675 990 968',
        tradingName: 'Quni Living',
      }),
    ).toBe('Quinnvestments Pty Ltd (ACN 675 990 968) trading as Quni Living')
  })
})
