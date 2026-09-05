import { describe, expect, it } from 'vitest'
import { isQldHouseRulesPageGatedPath, resolveQldHouseRulesPageEnabled } from './qldHouseRulesPageGateCore'

describe('qldHouseRulesPageGate', () => {
  it('defaults OFF in production when override unset', () => {
    expect(
      resolveQldHouseRulesPageEnabled({
        vercelEnv: 'production',
        override: '',
        treatUnknownAsEnabled: true,
      }),
    ).toBe(false)
  })

  it('defaults ON in preview when override unset', () => {
    expect(
      resolveQldHouseRulesPageEnabled({
        vercelEnv: 'preview',
        override: '',
        treatUnknownAsEnabled: false,
      }),
    ).toBe(true)
  })

  it('recognises the gated path', () => {
    expect(isQldHouseRulesPageGatedPath('/qld-house-rules')).toBe(true)
    expect(isQldHouseRulesPageGatedPath('/qld-house-rules/')).toBe(true)
    expect(isQldHouseRulesPageGatedPath('/for-landlords')).toBe(false)
  })
})
