import { describe, expect, it } from 'vitest'
import { qldHouseRulesCorsAllowOrigin } from './cors'

describe('qldHouseRulesCorsAllowOrigin', () => {
  it('allows production and local, rejects other sites', () => {
    expect(qldHouseRulesCorsAllowOrigin('https://quni.com.au')).toBe('https://quni.com.au')
    expect(qldHouseRulesCorsAllowOrigin('https://www.quni.com.au')).toBe('https://www.quni.com.au')
    expect(qldHouseRulesCorsAllowOrigin('http://localhost:5173')).toBe('http://localhost:5173')
    expect(qldHouseRulesCorsAllowOrigin('https://quni-living-abc.vercel.app')).toBe(
      'https://quni-living-abc.vercel.app',
    )
    expect(qldHouseRulesCorsAllowOrigin('https://other-app.vercel.app')).toBeNull()
    expect(qldHouseRulesCorsAllowOrigin('https://evil.example')).toBeNull()
    expect(qldHouseRulesCorsAllowOrigin('')).toBeNull()
  })
})
