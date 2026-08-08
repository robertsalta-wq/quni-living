import { describe, expect, it, vi } from 'vitest'
import {
  formatAuNumericDateAsYouType,
  parseAuNumericDateToIso,
} from '../lib/listingAvailabilityDates'
import { birthDatePickerAnchorIso } from './AUDateField'

describe('birthDatePickerAnchorIso', () => {
  it('anchors ~30 years before max for empty birth-date pickers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'))
    expect(birthDatePickerAnchorIso('2026-06-20', '1920-01-01')).toBe('1996-06-20')
    vi.useRealTimers()
  })

  it('respects minimum birth year', () => {
    expect(birthDatePickerAnchorIso('2026-06-20', '2000-01-01')).toBe('2000-06-20')
  })
})

describe('formatAuNumericDateAsYouType', () => {
  it('inserts slashes so a numeric keypad can enter dd/mm/yyyy', () => {
    expect(formatAuNumericDateAsYouType('01')).toBe('01')
    expect(formatAuNumericDateAsYouType('0101')).toBe('01/01')
    expect(formatAuNumericDateAsYouType('01011972')).toBe('01/01/1972')
  })

  it('strips non-digits and caps at 8', () => {
    expect(formatAuNumericDateAsYouType('01/01/1972')).toBe('01/01/1972')
    expect(formatAuNumericDateAsYouType('0101197299')).toBe('01/01/1972')
  })
})

describe('parseAuNumericDateToIso', () => {
  it('parses slashed and digit-only AU dates', () => {
    expect(parseAuNumericDateToIso('01/01/1972')).toBe('1972-01-01')
    expect(parseAuNumericDateToIso('01011972')).toBe('1972-01-01')
  })

  it('rejects invalid calendar dates', () => {
    expect(parseAuNumericDateToIso('31/02/2000')).toBeNull()
    expect(parseAuNumericDateToIso('0101')).toBeNull()
  })
})
