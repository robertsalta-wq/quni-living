import { describe, expect, it } from 'vitest'
import { marketplaceRoleForWrite } from './marketplaceRole'

describe('marketplaceRoleForWrite', () => {
  it.each([
    { input: 'student', output: 'renter' },
    { input: 'renter', output: 'renter' },
    { input: 'landlord', output: 'landlord' },
    { input: 'admin', output: 'admin' },
    { input: null, output: null },
    { input: undefined, output: undefined },
    { input: 'unknown', output: 'unknown' },
    { input: '', output: '' },
  ] as const)('coerces $input → $output', ({ input, output }) => {
    expect(marketplaceRoleForWrite(input)).toBe(output)
  })
})
