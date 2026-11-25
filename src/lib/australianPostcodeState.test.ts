import { describe, expect, it } from 'vitest'
import {
  postcodeStateConflictMessage,
  stateFromAustralianPostcode,
} from './australianPostcodeState'

describe('australianPostcodeState', () => {
  it('maps the state ranges, including Northern Territory leading zeros', () => {
    expect(stateFromAustralianPostcode('2000')).toBe('NSW')
    expect(stateFromAustralianPostcode('2618')).toBe('ACT')
    expect(stateFromAustralianPostcode('2619')).toBe('NSW')
    expect(stateFromAustralianPostcode('2900')).toBe('ACT')
    expect(stateFromAustralianPostcode('3053')).toBe('VIC')
    expect(stateFromAustralianPostcode('8000')).toBe('VIC')
    expect(stateFromAustralianPostcode('4000')).toBe('QLD')
    expect(stateFromAustralianPostcode('9000')).toBe('QLD')
    expect(stateFromAustralianPostcode('5000')).toBe('SA')
    expect(stateFromAustralianPostcode('6000')).toBe('WA')
    expect(stateFromAustralianPostcode('7000')).toBe('TAS')
    expect(stateFromAustralianPostcode('0800')).toBe('NT')
    expect(stateFromAustralianPostcode('305')).toBeNull()
    expect(stateFromAustralianPostcode('1000')).toBeNull()
  })

  it('names a conflict and stays quiet when the postcode matches the state', () => {
    expect(postcodeStateConflictMessage('3053', 'WA')).toBe('Postcode 3053 is in VIC, but the state is WA')
    expect(postcodeStateConflictMessage('3053', 'VIC')).toBeNull()
    expect(postcodeStateConflictMessage('3053', '')).toBeNull()
    expect(postcodeStateConflictMessage('30', 'WA')).toBeNull()
  })
})