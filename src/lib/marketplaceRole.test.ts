import { describe, expect, it } from 'vitest'
import { isRenterRole, marketplaceRoleForWrite } from './marketplaceRole'

describe('isRenterRole', () => {
  it.each([
    { input: 'renter', expected: true },
    { input: 'student', expected: false },
    { input: 'landlord', expected: false },
    { input: 'admin', expected: false },
    { input: null, expected: false },
    { input: undefined, expected: false },
  ] as const)('returns $expected for $input', ({ input, expected }) => {
    expect(isRenterRole(input)).toBe(expected)
  })
})

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
