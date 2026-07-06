/**
 * DocuSeal signing tags on the official NSW FT6600 after schedule fill + flatten.
 * Widget style matches production sigHint (refined-b-v2 baseline): 7pt #6b7280.
 */
import { StandardFonts, rgb, PDFDocument, type PDFDocument as PDFDoc, type PDFFont, type RGB } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
  type OfficialNswFt6600FillResult,
} from './officialNswFt6600Fill.js'
import {
  applyOfficialNswFt6600NoBondStrikeOutIfNeeded,
  prepareOfficialNswFt6600NoBondStrikeBounds,
} from './officialNswFt6600BondCrossOut.js'
import { flattenAndCleanForm, saveNormalizedPdf } from './officialNswFt6600PdfNormalize.js'

/** Production NswResidentialTenancyAgreement sigHint - refined-b-v2 spike baseline. */
export const OFFICIAL_FT6600_WIDGET_TAG_STYLE = {
  size: 7,
  color: rgb(0.42, 0.45, 0.5),
} as const

/** Five signature widgets on pages 17–18 (sig_tenant_3 / sig_tenant_4 out of scope). */
export const OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST = [
  'sig_landlord',
  'sig_landlord_lis',
  'sig_tenant_1',
  'sig_tenant_2',
  'sig_tenant_tis',
] as const

/**
 * p18 TIS signature box - from docs/nsw/ft6600-corrected-field-map.json.
 * Renamed template has no AcroForm widgets on page 18; sig_tenant_tis sits on p17 incorrectly.
 */
export const OFFICIAL_FT6600_TIS_PAGE_INDEX = 17

export const OFFICIAL_FT6600_TIS_SIGNATURE_ANCHOR = {
  pageIndex: OFFICIAL_FT6600_TIS_PAGE_INDEX,
  x: 34.0,
  y: 389.7,
  width: 181.4,
  height: 36.8,
} as const

export const OFFICIAL_FT6600_TIS_DATE_ANCHOR = {
  pageIndex: OFFICIAL_FT6600_TIS_PAGE_INDEX,
  x: 325.6,
  y: 407.3,
  width: 102.3,
  height: 19.1,
} as const

/** Page index for landlord/tenant signature spread (human page 17). */
export const OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX = 16

/**
 * DocuSeal parser unlock anchors — bottom-left margin of page 16.
 * Duplicate landlord/tenant signature names are intentional; see TECH_DEBT.md.
 */
export const OFFICIAL_FT6600_PARSER_ANCHOR_STYLE = {
  size: 14,
  color: rgb(0, 0, 0),
} as const

export const OFFICIAL_FT6600_PARSER_ANCHORS = [
  {
    tag: '{{Landlord Signature;role=First Party;type=signature}}',
    pageIndex: OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX,
    x: 12,
    y: 18,
  },
  {
    tag: '{{Tenant Signature;role=Second Party;type=signature}}',
    pageIndex: OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX,
    x: 12,
    y: 34,
  },
] as const

export const OFFICIAL_FT6600_CO_TENANT_PARSER_ANCHOR = {
  tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}',
  pageIndex: OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX,
  x: 12,
  y: 50,
} as const

export type SignatureWidgetPlacement = {
  fieldName: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type DocusealTagPlacement = {
  tag: string
  fieldName: string
  pageIndex: number
  x: number
  y: number
  size: number
  color: RGB
}

type WidgetTagDef = {
  tag: string
  fieldName: string
  coTenantOnly?: boolean
}

/** Signature + date tags mapped to semantic AcroForm names (three DocuSeal roles). */
const WIDGET_TAG_DEFS: WidgetTagDef[] = [
  { tag: '{{Landlord Signature;role=First Party;type=signature}}', fieldName: 'sig_landlord' },
  { tag: '{{Landlord Sign Date;role=First Party;type=date}}', fieldName: 'landlord_sig_month' },
  { tag: '{{Landlord LIS Signature;role=First Party;type=signature}}', fieldName: 'sig_landlord_lis' },
  { tag: '{{Landlord LIS Date;role=First Party;type=date}}', fieldName: 'landlord_lis_sig_month' },
  { tag: '{{Tenant Signature;role=Second Party;type=signature}}', fieldName: 'sig_tenant_1' },
  { tag: '{{Tenant Sign Date;role=Second Party;type=date}}', fieldName: 'tenant_1_sig_month' },
  { tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}', fieldName: 'sig_tenant_2', coTenantOnly: true },
  { tag: '{{Tenant 2 Sign Date;role=Co-tenant;type=date}}', fieldName: 'tenant_2_sig_month', coTenantOnly: true },
  { tag: '{{Tenant TIS Signature;role=Second Party;type=signature}}', fieldName: 'sig_tenant_tis' },
  { tag: '{{Tenant TIS Date;role=Second Party;type=date}}', fieldName: 'tenant_tis_sig_month' },
]

const FIELD_PLACEMENT_OVERRIDES: Record<string, SignatureWidgetPlacement> = {
  sig_tenant_tis: { fieldName: 'sig_tenant_tis', ...OFFICIAL_FT6600_TIS_SIGNATURE_ANCHOR },
  tenant_tis_sig_month: { fieldName: 'tenant_tis_sig_month', ...OFFICIAL_FT6600_TIS_DATE_ANCHOR },
}

function resolveWidgetPageIndex(doc: PDFDoc, widget: unknown): number | null {
  const pages = doc.getPages()
  const widgetRef = (widget as { ref?: unknown }).ref
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (widgetRef != null && annots.get(j) === widgetRef) return i
    }
  }
  return null
}

function collectFieldWidgets(doc: PDFDoc, fieldNames: readonly string[]): SignatureWidgetPlacement[] {
  const wanted = new Set(fieldNames)
  const out: SignatureWidgetPlacement[] = []
  for (const field of doc.getForm().getFields()) {
    const name = field.getName()
    if (!wanted.has(name)) continue
    if (FIELD_PLACEMENT_OVERRIDES[name]) continue
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle()
      const pageIndex = resolveWidgetPageIndex(doc, widget) ?? 16
      out.push({
        fieldName: name,
        pageIndex,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    }
  }
  return out.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    return b.y - a.y
  })
}

export function collectOfficialNswFt6600SignatureWidgets(doc: PDFDoc): SignatureWidgetPlacement[] {
  const fromForm = collectFieldWidgets(doc, OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST)
  if (!fromForm.some((w) => w.fieldName === 'sig_tenant_tis')) {
    fromForm.push(FIELD_PLACEMENT_OVERRIDES.sig_tenant_tis)
  }
  return fromForm.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    return b.y - a.y
  })
}

/** Collect signature + adjacent date widgets before flatten for DocuSeal tag overlay. */
export function collectOfficialNswFt6600SigningFieldWidgets(
  doc: PDFDoc,
  options: { includeCoTenantSignatureTags: boolean },
): SignatureWidgetPlacement[] {
  const fieldNames = WIDGET_TAG_DEFS.filter(
    (d) => !d.coTenantOnly || options.includeCoTenantSignatureTags,
  ).map((d) => d.fieldName)
  return collectFieldWidgets(doc, fieldNames)
}

function placementFromWidget(w: SignatureWidgetPlacement, style: typeof OFFICIAL_FT6600_WIDGET_TAG_STYLE, tag: string): DocusealTagPlacement {
  return {
    tag,
    fieldName: w.fieldName,
    pageIndex: w.pageIndex,
    x: w.x + 4,
    y: w.y + w.height * 0.35,
    size: style.size,
    color: style.color,
  }
}

/** Widget-level tags - explicit fieldName → tag map (landlord / tenant 1 / co-tenant roles). */
export function buildWidgetTagPlacements(
  widgets: SignatureWidgetPlacement[],
  includeCoTenantSignatureTags: boolean,
): DocusealTagPlacement[] {
  const byField = new Map<string, SignatureWidgetPlacement>()
  for (const w of widgets) {
    if (!byField.has(w.fieldName)) byField.set(w.fieldName, w)
  }

  const style = OFFICIAL_FT6600_WIDGET_TAG_STYLE
  const placements: DocusealTagPlacement[] = []

  for (const def of WIDGET_TAG_DEFS) {
    if (def.coTenantOnly && !includeCoTenantSignatureTags) continue
    const w = FIELD_PLACEMENT_OVERRIDES[def.fieldName] ?? byField.get(def.fieldName)
    if (!w) continue
    placements.push(placementFromWidget(w, style, def.tag))
  }

  return placements
}

export function drawWidgetDocusealTags(
  doc: PDFDoc,
  placements: DocusealTagPlacement[],
  font: PDFFont,
): void {
  const pages = doc.getPages()
  for (const p of placements) {
    const page = pages[p.pageIndex]
    if (!page) continue
    page.drawText(p.tag, { x: p.x, y: p.y, size: p.size, font, color: p.color })
  }
}

/** 14pt black margin anchors that unlock DocuSeal field detection on the official FT6600. */
export function drawParserAnchorTags(
  doc: PDFDoc,
  options: { includeCoTenantSignatureTags: boolean },
  font: PDFFont,
): void {
  const style = OFFICIAL_FT6600_PARSER_ANCHOR_STYLE
  const pages = doc.getPages()
  const anchors = options.includeCoTenantSignatureTags
    ? [...OFFICIAL_FT6600_PARSER_ANCHORS, OFFICIAL_FT6600_CO_TENANT_PARSER_ANCHOR]
    : OFFICIAL_FT6600_PARSER_ANCHORS
  for (const anchor of anchors) {
    const page = pages[anchor.pageIndex]
    if (!page) continue
    page.drawText(anchor.tag, {
      x: anchor.x,
      y: anchor.y,
      size: style.size,
      font,
      color: style.color,
    })
  }
}

/**
 * Best-effort check that overlay tags made it into the PDF bytes.
 * Full `{{…;role=…}}` strings are usually compressed (not latin1-plaintext); `{{` alone is reliable.
 */
export function pdfBufferHasDocusealTags(buf: Uint8Array | Buffer): boolean {
  return Buffer.from(buf).includes(Buffer.from('{{'))
}

export type OfficialNswFt6600WithSigningResult = OfficialNswFt6600FillResult & {
  hasDocusealTags: boolean
  tagCount: number
  widgetTagCount: number
  widgetTagFieldNames: string[]
  widgetTagPlacements: Array<Pick<DocusealTagPlacement, 'tag' | 'fieldName' | 'pageIndex' | 'x' | 'y'>>
  includeCoTenantSignatureTags: boolean
}

/**
 * Fill official FT6600, flatten, overlay DocuSeal tags at widget coordinates.
 */
export async function buildOfficialNswFt6600PdfWithSigning(
  props: NswResidentialTenancyAgreementProps,
  options: { includeCoTenantSignatureTags: boolean },
): Promise<OfficialNswFt6600WithSigningResult> {
  const doc = await loadOfficialNswFt6600Template()
  const noBondStrikeBounds = prepareOfficialNswFt6600NoBondStrikeBounds(doc, props.bond.amount)
  const signingWidgetsBeforeFlatten = collectOfficialNswFt6600SigningFieldWidgets(doc, options)
  const { filledFieldNames } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)

  flattenAndCleanForm(doc)
  applyOfficialNswFt6600NoBondStrikeOutIfNeeded(doc, props.bond.amount, noBondStrikeBounds)

  const tagPlacements = buildWidgetTagPlacements(signingWidgetsBeforeFlatten, options.includeCoTenantSignatureTags)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  const acroFormFieldCountAfterFlatten = 0
  // Phase 1: widget tags only. Phase 2: reload + margin anchors (single-pass anchors do not unlock DocuSeal).
  const phase1Bytes = await saveNormalizedPdf(doc)
  const docWithAnchors = await PDFDocument.load(phase1Bytes, { ignoreEncryption: true, updateMetadata: false })
  drawParserAnchorTags(docWithAnchors, options, font)
  const pdfBytes = await saveNormalizedPdf(docWithAnchors)
  const minWidgetTags = WIDGET_TAG_DEFS.filter(
    (d) => !d.coTenantOnly || options.includeCoTenantSignatureTags,
  ).length
  const hasDocusealTags = tagPlacements.length >= minWidgetTags && pdfBufferHasDocusealTags(pdfBytes)

  return {
    pdfBytes,
    filledFieldNames,
    acroFormFieldCountAfterFlatten,
    hasDocusealTags,
    tagCount: tagPlacements.length,
    widgetTagCount: tagPlacements.length,
    widgetTagFieldNames: tagPlacements.map((p) => p.fieldName),
    widgetTagPlacements: tagPlacements.map(({ tag, fieldName, pageIndex, x, y }) => ({
      tag,
      fieldName,
      pageIndex,
      x,
      y,
    })),
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
  }
}
