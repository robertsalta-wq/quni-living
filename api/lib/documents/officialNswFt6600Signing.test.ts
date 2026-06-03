import { describe, expect, it } from 'vitest'

import {
  OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST,
  OFFICIAL_FT6600_TIS_PAGE_INDEX,
  OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  buildWidgetTagPlacements,
  collectOfficialNswFt6600SignatureWidgets,
  pdfBufferHasDocusealTags,
} from './officialNswFt6600Signing.js'
import { loadOfficialNswFt6600Template } from './officialNswFt6600Fill.js'

describe('collectOfficialNswFt6600SignatureWidgets', () => {
  it('collects the five sig_* allowlist widgets from the renamed template', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SignatureWidgets(doc)
    expect(widgets.map((w) => w.fieldName).sort()).toEqual([...OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST].sort())
    expect(widgets.find((w) => w.fieldName === 'sig_tenant_tis')?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(widgets.filter((w) => w.fieldName !== 'sig_tenant_tis').every((w) => w.pageIndex === 16)).toBe(true)
  })
})

describe('buildWidgetTagPlacements', () => {
  it('maps landlord, tenant 1, and TIS widgets to three roles without co-tenant', () => {
    const widgets = [
      { fieldName: 'sig_landlord', pageIndex: 16, x: 10, y: 700, width: 100, height: 30 },
      { fieldName: 'landlord_sig_day', pageIndex: 16, x: 120, y: 700, width: 20, height: 12 },
      { fieldName: 'sig_landlord_lis', pageIndex: 16, x: 10, y: 650, width: 100, height: 30 },
      { fieldName: 'landlord_lis_sig_day', pageIndex: 16, x: 120, y: 650, width: 20, height: 12 },
      { fieldName: 'sig_tenant_1', pageIndex: 16, x: 10, y: 600, width: 100, height: 30 },
      { fieldName: 'tenant_1_sig_day', pageIndex: 16, x: 120, y: 600, width: 20, height: 12 },
      { fieldName: 'sig_tenant_tis', pageIndex: 17, x: 10, y: 500, width: 100, height: 30 },
      { fieldName: 'tenant_tis_sig_day', pageIndex: 17, x: 120, y: 500, width: 20, height: 12 },
    ]
    const placements = buildWidgetTagPlacements(widgets, false)
    expect(placements).toHaveLength(8)
    expect(placements.map((p) => p.fieldName)).toEqual([
      'sig_landlord',
      'landlord_sig_day',
      'sig_landlord_lis',
      'landlord_lis_sig_day',
      'sig_tenant_1',
      'tenant_1_sig_day',
      'sig_tenant_tis',
      'tenant_tis_sig_day',
    ])
    expect(placements.every((p) => p.tag.includes('{{'))).toBe(true)
  })

  it('places TIS signature and date on page 18 coordinate anchors', () => {
    const placements = buildWidgetTagPlacements([], false)
    const tisSig = placements.find((p) => p.fieldName === 'sig_tenant_tis')
    const tisDate = placements.find((p) => p.fieldName === 'tenant_tis_sig_day')
    expect(tisSig?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisDate?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisSig?.y).toBeGreaterThan(400)
    expect(tisSig?.y).toBeLessThan(420)
  })
})

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
