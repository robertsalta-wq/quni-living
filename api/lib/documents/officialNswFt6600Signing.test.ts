import { describe, expect, it } from 'vitest'

import {
  OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  pdfBufferHasDocusealTags,
} from './officialNswFt6600Signing.js'

describe('pdfBufferHasDocusealTags', () => {
  it('returns false for empty buffer', () => {
    expect(pdfBufferHasDocusealTags(Buffer.alloc(0))).toBe(false)
  })

  it('returns true when {{ appears in buffer (compressed PDF streams)', () => {
    expect(pdfBufferHasDocusealTags(Buffer.from('prefix{{tag}}suffix', 'latin1'))).toBe(true)
  })
})

describe('OFFICIAL_FT6600_WIDGET_TAG_STYLE', () => {
  it('matches refined-b-v2 / sigHint baseline (7pt, gray)', () => {
    expect(OFFICIAL_FT6600_WIDGET_TAG_STYLE.size).toBe(7)
    expect(OFFICIAL_FT6600_WIDGET_TAG_STYLE.color.red).toBeCloseTo(0.42, 2)
    expect(OFFICIAL_FT6600_WIDGET_TAG_STYLE.color.green).toBeCloseTo(0.45, 2)
    expect(OFFICIAL_FT6600_WIDGET_TAG_STYLE.color.blue).toBeCloseTo(0.5, 2)
  })
})
