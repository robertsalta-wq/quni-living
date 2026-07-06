import { describe, expect, it } from 'vitest'

import {
  OFFICIAL_FT6600_DATE_FORMAT,
  OFFICIAL_FT6600_PARSER_ANCHOR_STYLE,
  OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST,
  OFFICIAL_FT6600_TIS_PAGE_INDEX,
  OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  assertDocusealTagPlacementsWithinSourceWidgets,
  buildWidgetTagPlacements,
  collectOfficialNswFt6600SignatureWidgets,
  collectOfficialNswFt6600SigningPlacements,
  pdfBufferHasDocusealTags,
  unionSignatureWidgetPlacements,
} from './officialNswFt6600Signing.js'
import { loadOfficialNswFt6600Template } from './officialNswFt6600Fill.js'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from './buildNswFt6600AgreementProps.js'
import { QUINN_ROBERT_FT6600_LISTING_INPUT } from './quinnRobertFt6600Fixture.js'
import { buildOfficialNswFt6600PdfWithSigning } from './officialNswFt6600Signing.js'

describe('collectOfficialNswFt6600SignatureWidgets', () => {
  it('reads legacy AcroForm rects for the five sig_* fields on pages 16–17', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SignatureWidgets(doc)
    expect(widgets.map((w) => w.fieldName).sort()).toEqual([...OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST].sort())
    expect(widgets.find((w) => w.fieldName === 'sig_landlord')?.y).toBeGreaterThan(560)
    expect(widgets.find((w) => w.fieldName === 'sig_tenant_tis')?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(widgets.filter((w) => w.fieldName !== 'sig_tenant_tis').every((w) => w.pageIndex === 16)).toBe(true)
  })
})

describe('collectOfficialNswFt6600SigningPlacements', () => {
  it('aligns each date span Y with its signature row from AcroForm widgets', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const placements = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const landlordSig = placements.find((p) => p.fieldName === 'sig_landlord')
    const landlordDate = placements.find((p) => p.fieldName === 'landlord_sig_date')
    const tenantSig = placements.find((p) => p.fieldName === 'sig_tenant_1')
    const tenantDate = placements.find((p) => p.fieldName === 'tenant_1_sig_date')
    expect(landlordSig?.y).toBeCloseTo(landlordDate!.y, 0)
    expect(tenantSig?.y).toBeCloseTo(tenantDate!.y, 0)
    expect(landlordDate?.width).toBeGreaterThan(220)
  })

  it('unions day/month/year widgets into one spanning date rect', () => {
    const span = unionSignatureWidgetPlacements('tenant_tis_sig_date', [
      { fieldName: 'tenant_tis_sig_day', pageIndex: 17, x: 251.9, y: 415.5, width: 35.6, height: 19.1 },
      { fieldName: 'tenant_tis_sig_month', pageIndex: 17, x: 325.6, y: 415.5, width: 102.3, height: 19.1 },
      { fieldName: 'tenant_tis_sig_year', pageIndex: 17, x: 446.7, y: 415.5, width: 35.6, height: 19.1 },
    ])
    expect(span.x).toBeCloseTo(251.9, 0)
    expect(span.y).toBeCloseTo(415.5, 0)
    expect(span.width).toBeCloseTo(230.3, 0)
  })
})

describe('buildWidgetTagPlacements', () => {
  it('maps landlord, tenant 1, and TIS widgets to three roles without co-tenant', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = buildWidgetTagPlacements(widgets, false)
    expect(placements).toHaveLength(6)
    expect(placements.map((p) => p.fieldName)).toEqual([
      'landlord_sig_date',
      'sig_landlord_lis',
      'landlord_lis_sig_date',
      'tenant_1_sig_date',
      'sig_tenant_tis',
      'tenant_tis_sig_date',
    ])
    expect(placements.every((p) => p.tag.includes('{{'))).toBe(true)
    const landlordDate = placements.find((p) => p.fieldName === 'landlord_sig_date')
    expect(landlordDate?.tag).toContain(`format=${OFFICIAL_FT6600_DATE_FORMAT}`)
    expect(landlordDate?.tag).toMatch(/width=23\d/)
    assertDocusealTagPlacementsWithinSourceWidgets(placements, widgets)
  })

  it('places TIS signature and spanning date on page 18 AcroForm row', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = buildWidgetTagPlacements(widgets, false)
    const tisSig = placements.find((p) => p.fieldName === 'sig_tenant_tis')
    const tisDate = placements.find((p) => p.fieldName === 'tenant_tis_sig_date')
    expect(tisSig?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisDate?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisSig?.y).toBeGreaterThan(400)
    expect(tisDate?.x).toBeCloseTo(251.9, 0)
    expect(tisDate?.tag).toContain(`format=${OFFICIAL_FT6600_DATE_FORMAT}`)
    expect(Math.abs(tisDate!.y - tisSig!.y)).toBeLessThan(12)
  })
})

describe('buildOfficialNswFt6600PdfWithSigning placement regression', () => {
  it('fill + flatten keeps every tag inside its source AcroForm widget rect', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_FT6600_LISTING_INPUT)
    const built = await buildOfficialNswFt6600PdfWithSigning(props, { includeCoTenantSignatureTags: false })
    expect(built.hasDocusealTags).toBe(true)
    expect(built.widgetTagCount).toBeGreaterThanOrEqual(6)
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

describe('OFFICIAL_FT6600_PARSER_ANCHOR_STYLE', () => {
  it('uses 14pt black parser anchors per refined-b recipe', () => {
    expect(OFFICIAL_FT6600_PARSER_ANCHOR_STYLE.size).toBe(14)
    expect(OFFICIAL_FT6600_PARSER_ANCHOR_STYLE.color.red).toBe(0)
    expect(OFFICIAL_FT6600_PARSER_ANCHOR_STYLE.color.green).toBe(0)
    expect(OFFICIAL_FT6600_PARSER_ANCHOR_STYLE.color.blue).toBe(0)
  })
})
