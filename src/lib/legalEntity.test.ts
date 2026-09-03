import { describe, expect, it } from 'vitest'
import {
  buildLegalFooterText,
  formatContractingPartyName,
  getFallbackLegalEntity,
  LEGAL_ENTITY_ACN,
  LEGAL_ENTITY_NAME,
} from './legalEntity.js'

describe('formatContractingPartyName', () => {
  it('uses t/a when a trading name is present', () => {
    expect(formatContractingPartyName()).toBe('Quinnvestments Pty Ltd t/a Quni Living')
  })
})

describe('buildLegalFooterText', () => {
  it('includes contracting party, ABN, ACN and registered office', () => {
    const text = buildLegalFooterText(getFallbackLegalEntity())
    expect(text).toContain('Quinnvestments Pty Ltd t/a Quni Living')
    expect(text).toContain('ABN 65 675 990 968')
    expect(text).toContain(`ACN ${LEGAL_ENTITY_ACN}`)
    expect(text).toContain('Registered office:')
    expect(text).not.toContain('Quni Living Pty Ltd')
    expect(LEGAL_ENTITY_NAME).toBe('Quinnvestments Pty Ltd')
  })
})
