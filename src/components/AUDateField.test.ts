import { describe, expect, it, vi } from 'vitest'
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
