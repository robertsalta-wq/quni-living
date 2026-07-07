import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import path from 'node:path'

import {
  OFFICIAL_FT6600_DATE_COLUMN_X_PT,
  OFFICIAL_FT6600_DATE_FIELD_HEIGHT_PT,
  OFFICIAL_FT6600_DATE_FIELD_LEFT_INSET_PT,
  OFFICIAL_FT6600_DATE_ROW_DEFS,
  OFFICIAL_FT6600_PARSER_ANCHOR_STYLE,
  OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT,
  OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST,
  OFFICIAL_FT6600_SPIKE_TEST_SIGNATURE_IMAGE_ASPECT,
  OFFICIAL_FT6600_TIS_PAGE_INDEX,
  OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  assertDocusealTagPlacementsWithinSourceWidgets,
  assertFt6600SignatureTagsClearDateColumn,
  buildParserAnchorTagPlacements,
  buildWidgetTagPlacements,
  collectOfficialNswFt6600SignatureWidgets,
  collectOfficialNswFt6600SigningPlacements,
  countExpectedFt6600WidgetTags,
  officialFt6600DateFieldDimensions,
  officialFt6600SignatureTagDimensions,
  predictFt6600AspectFitInkHeight,
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
  it('aligns each date component row Y with its signature row from AcroForm widgets', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const placements = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const landlordSig = placements.find((p) => p.fieldName === 'sig_landlord')
    const landlordDay = placements.find((p) => p.fieldName === 'landlord_sig_day')
    const tenantSig = placements.find((p) => p.fieldName === 'sig_tenant_1')
    const tenantDay = placements.find((p) => p.fieldName === 'tenant_1_sig_day')
    expect(landlordSig?.y).toBeCloseTo(landlordDay!.y, 0)
    expect(tenantSig?.y).toBeCloseTo(tenantDay!.y, 0)
    expect(landlordDay?.width).toBeCloseTo(35.6, 0)
    expect(landlordDay?.width).toBeLessThan(80)
  })

  it('exposes day/month/year widgets individually (no spanning union)', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const placements = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    for (const row of OFFICIAL_FT6600_DATE_ROW_DEFS.filter((r) => !r.coTenantOnly)) {
      for (const { acro } of row.components) {
        expect(placements.some((p) => p.fieldName === acro)).toBe(true)
      }
    }
    expect(placements.some((p) => p.fieldName === 'landlord_sig_date')).toBe(false)
  })

  it('unions day/month/year widgets for legacy helper', () => {
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
  it('maps LIS/TIS signatures and twelve date text components without co-tenant', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = buildWidgetTagPlacements(widgets, false)
    expect(placements).toHaveLength(countExpectedFt6600WidgetTags(false))
    expect(placements).toHaveLength(14)
    expect(placements.filter((p) => p.tag.includes('type=signature'))).toHaveLength(2)
    expect(placements.filter((p) => p.tag.includes('type=text'))).toHaveLength(12)
    expect(placements.every((p) => !p.tag.includes('type=date'))).toBe(true)
    expect(placements.every((p) => !p.tag.includes(`format=`))).toBe(true)

    const lisWidget = widgets.find((w) => w.fieldName === 'sig_landlord_lis')
    const landlordWidget = widgets.find((w) => w.fieldName === 'sig_landlord')
    const lisSig = placements.find((p) => p.fieldName === 'sig_landlord_lis')
    expect(lisWidget?.width).toBeCloseTo(landlordWidget!.width, 0)
    expect(lisSig?.tag).toContain(`height=${OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT}`)
    expect(lisSig?.tag).toContain(`width=${Math.round(lisWidget!.width)}`)

    const landlordDay = placements.find((p) => p.fieldName === 'landlord_sig_day')
    expect(landlordDay?.tag).toContain('type=text')
    expect(landlordDay?.tag).toContain('Landlord Sign Day')
    expect(landlordDay?.tag).toContain(`height=${OFFICIAL_FT6600_DATE_FIELD_HEIGHT_PT}`)
    const dayWidget = widgets.find((w) => w.fieldName === 'landlord_sig_day')
    const dayDims = officialFt6600DateFieldDimensions(dayWidget!)
    expect(landlordDay?.tag).toContain(`width=${dayDims.widthPt}`)
    expect(landlordDay?.x).toBeCloseTo(dayDims.xPt, 0)
    expect(landlordDay?.y).toBeCloseTo(dayDims.yPt, 0)

    assertDocusealTagPlacementsWithinSourceWidgets(placements, widgets)
    assertFt6600SignatureTagsClearDateColumn(placements)
  })

  it('places TIS signature and three date text fields on page 18 AcroForm row', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = buildWidgetTagPlacements(widgets, false)
    const tisSig = placements.find((p) => p.fieldName === 'sig_tenant_tis')
    const tisDay = placements.find((p) => p.fieldName === 'tenant_tis_sig_day')
    expect(tisSig?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisDay?.pageIndex).toBe(OFFICIAL_FT6600_TIS_PAGE_INDEX)
    expect(tisSig?.y).toBeGreaterThan(400)
    expect(tisDay?.x).toBeCloseTo(255.9, 0)
    expect(tisSig?.tag).toContain(`height=${OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT}`)
    expect(Math.abs(tisDay!.y - tisSig!.y)).toBeLessThan(12)
  })

  it('normalises all widget signature tag heights to the 32.4pt class', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = buildWidgetTagPlacements(widgets, false)
    for (const p of placements.filter((t) => t.tag.includes('type=signature'))) {
      expect(p.tag).toMatch(new RegExp(`height=${OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT}`))
    }
  })

  it('keeps signature tags left of the printed date column', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const placements = [
      ...buildWidgetTagPlacements(widgets, false),
      ...buildParserAnchorTagPlacements(widgets, { includeCoTenantSignatureTags: false }),
    ]
    for (const p of placements.filter((t) => t.tag.includes('type=signature'))) {
      const width = Number(p.tag.match(/width=(\d+)/)?.[1] ?? 0)
      expect(p.x + width).toBeLessThan(OFFICIAL_FT6600_DATE_COLUMN_X_PT - 8)
    }
  })

  it('uses full AcroForm printed-box width for every execution signature tag', async () => {
    const doc = await loadOfficialNswFt6600Template()
    const widgets = collectOfficialNswFt6600SigningPlacements(doc, { includeCoTenantSignatureTags: false })
    const sigWidgets = widgets.filter((w) => w.fieldName.startsWith('sig_') && w.fieldName !== 'sig_tenant_2')
    expect(sigWidgets.every((w) => w.width > 170)).toBe(true)
    const placements = [
      ...buildWidgetTagPlacements(widgets, false),
      ...buildParserAnchorTagPlacements(widgets, { includeCoTenantSignatureTags: false }),
    ]
    for (const p of placements.filter((t) => t.tag.includes('type=signature'))) {
      const source = widgets.find((w) => w.fieldName === p.fieldName)
      expect(source).toBeTruthy()
      expect(p.tag).toContain(`width=${Math.round(source!.width)}`)
      expect(
        predictFt6600AspectFitInkHeight(source!.width, OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT),
      ).toBeCloseTo(OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT, 1)
    }
  })
})

const spikeExecutedPdf = process.env.FT6600_SPIKE_EXECUTED_PDF
const spikeFieldsJson = process.env.FT6600_SPIKE_FIELDS_JSON

describe.skipIf(!spikeExecutedPdf || !spikeFieldsJson)(
  'FT6600 spike executed PDF ink heights (PyMuPDF)',
  () => {
    it('asserts field rects and get_image_info ink heights ~32.4pt', () => {
      const assertScript = path.join(process.cwd(), 'scripts', 'assert-ft6600-execution-pdf.py')
      const raw = execSync(`python "${assertScript}" "${spikeExecutedPdf}" "${spikeFieldsJson}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      const jsonStart = raw.indexOf('{')
      const report = JSON.parse(jsonStart >= 0 ? raw.slice(jsonStart) : raw) as { passed?: boolean }
      expect(report.passed).toBe(true)
    })
  },
)

describe('buildOfficialNswFt6600PdfWithSigning placement regression', () => {
  it('fill + flatten keeps every tag inside its source AcroForm widget rect', async () => {
    const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_FT6600_LISTING_INPUT)
    const built = await buildOfficialNswFt6600PdfWithSigning(props, { includeCoTenantSignatureTags: false })
    expect(built.hasDocusealTags).toBe(true)
    expect(built.widgetTagCount).toBeGreaterThanOrEqual(countExpectedFt6600WidgetTags(false))
  }, 15_000)
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
