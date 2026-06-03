/**
 * DocuSeal signing tags on the official NSW FT6600 after schedule fill + flatten.
 * Widget style matches production sigHint (refined-b-v2 baseline): 7pt #6b7280.
 */
import { PDFDocument, StandardFonts, rgb, type PDFDocument as PDFDoc, type PDFFont, type RGB } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
  type OfficialNswFt6600FillResult,
} from './officialNswFt6600Fill.js'
import { flattenAndCleanForm, saveNormalizedPdf } from './officialNswFt6600PdfNormalize.js'

/** Production NswResidentialTenancyAgreement sigHint — refined-b-v2 spike baseline. */
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

/** Parser anchors (page 16, 0-based): bottom-left margin — see docs/nsw/ft6600-acroform-mapping.md */
const PARSER_ANCHOR_PAGE_INDEX = 16
const PARSER_ANCHOR_LANDLORD = { x: 12, y: 18 }
const PARSER_ANCHOR_TENANT = { x: 12, y: 34 }
const PARSER_ANCHOR_STYLE = { size: 14, color: rgb(0, 0, 0) } as const

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
  { tag: '{{Landlord Sign Date;role=First Party;type=date}}', fieldName: 'landlord_sig_day' },
  { tag: '{{Landlord LIS Signature;role=First Party;type=signature}}', fieldName: 'sig_landlord_lis' },
  { tag: '{{Landlord LIS Date;role=First Party;type=date}}', fieldName: 'landlord_lis_sig_day' },
  { tag: '{{Tenant Signature;role=Second Party;type=signature}}', fieldName: 'sig_tenant_1' },
  { tag: '{{Tenant Sign Date;role=Second Party;type=date}}', fieldName: 'tenant_1_sig_day' },
  { tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}', fieldName: 'sig_tenant_2', coTenantOnly: true },
  { tag: '{{Tenant 2 Sign Date;role=Co-tenant;type=date}}', fieldName: 'tenant_2_sig_day', coTenantOnly: true },
  { tag: '{{Tenant TIS Signature;role=Second Party;type=signature}}', fieldName: 'sig_tenant_tis' },
  { tag: '{{Tenant TIS Date;role=Second Party;type=date}}', fieldName: 'tenant_tis_sig_day' },
]

/** Third parser anchor (page 16 margin) — unlocks Co-tenant role; net-new vs two-party green. */
const PARSER_ANCHOR_CO_TENANT = { x: 12, y: 50 } as const

function resolveWidgetPageIndex(doc: PDFDoc, widget: { getRectangle: () => { x: number; y: number; width: number; height: number }; ref?: unknown }): number {
  const pages = doc.getPages()
  const widgetRef = (widget as unknown as { ref?: unknown }).ref
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (widgetRef != null && annots.get(j) === widgetRef) return i
    }
  }
  return 16
}

function collectFieldWidgets(doc: PDFDoc, fieldNames: readonly string[]): SignatureWidgetPlacement[] {
  const wanted = new Set(fieldNames)
  const out: SignatureWidgetPlacement[] = []
  for (const field of doc.getForm().getFields()) {
    const name = field.getName()
    if (!wanted.has(name)) continue
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle()
      out.push({
        fieldName: name,
        pageIndex: resolveWidgetPageIndex(doc, widget),
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
  return collectFieldWidgets(doc, OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST)
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

/** Widget-level tags — explicit fieldName → tag map (landlord / tenant 1 / co-tenant roles). */
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
    const w = byField.get(def.fieldName)
    if (!w) continue
    placements.push({
      tag: def.tag,
      fieldName: def.fieldName,
      pageIndex: w.pageIndex,
      x: w.x + 4,
      y: w.y + w.height * 0.35,
      size: style.size,
      color: style.color,
    })
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

/**
 * Proven v2 chain step 2: reload flattened+tagged PDF, draw margin anchors only.
 * Matches `scripts/test-ft6600-executed-tag-spike.mjs` / executed-spike-source.pdf.
 */
export async function applyMarginParserAnchors(
  doc: PDFDoc,
  options?: { includeCoTenantSignatureTags?: boolean },
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const anchorPage = doc.getPages()[PARSER_ANCHOR_PAGE_INDEX]
  if (!anchorPage) return

  anchorPage.drawText('{{Landlord Signature;role=First Party;type=signature}}', {
    x: PARSER_ANCHOR_LANDLORD.x,
    y: PARSER_ANCHOR_LANDLORD.y,
    size: PARSER_ANCHOR_STYLE.size,
    font,
    color: PARSER_ANCHOR_STYLE.color,
  })
  anchorPage.drawText('{{Tenant Signature;role=Second Party;type=signature}}', {
    x: PARSER_ANCHOR_TENANT.x,
    y: PARSER_ANCHOR_TENANT.y,
    size: PARSER_ANCHOR_STYLE.size,
    font,
    color: PARSER_ANCHOR_STYLE.color,
  })

  if (options?.includeCoTenantSignatureTags) {
    anchorPage.drawText('{{Tenant 2 Signature;role=Co-tenant;type=signature}}', {
      x: PARSER_ANCHOR_CO_TENANT.x,
      y: PARSER_ANCHOR_CO_TENANT.y,
      size: PARSER_ANCHOR_STYLE.size,
      font,
      color: PARSER_ANCHOR_STYLE.color,
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
  includeCoTenantSignatureTags: boolean
}

/**
 * Fill official FT6600, flatten, overlay DocuSeal tags + parser anchors.
 */
export async function buildOfficialNswFt6600PdfWithSigning(
  props: NswResidentialTenancyAgreementProps,
  options: { includeCoTenantSignatureTags: boolean },
): Promise<OfficialNswFt6600WithSigningResult> {
  const doc = await loadOfficialNswFt6600Template()
  const signingWidgetsBeforeFlatten = collectOfficialNswFt6600SigningFieldWidgets(doc, options)
  const { filledFieldNames } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)

  flattenAndCleanForm(doc)

  const tagPlacements = buildWidgetTagPlacements(signingWidgetsBeforeFlatten, options.includeCoTenantSignatureTags)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  let acroFormFieldCountAfterFlatten = 0

  // Two-step save: widget tags (phase 1) → reload → margin anchors only (phase 2).
  const phase1Bytes = await saveNormalizedPdf(doc)
  const docAnchored = await PDFDocument.load(phase1Bytes, { ignoreEncryption: true })
  await applyMarginParserAnchors(docAnchored, {
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
  })
  const pdfBytes = await saveNormalizedPdf(docAnchored)
  const minWidgetTags = WIDGET_TAG_DEFS.filter(
    (d) => !d.coTenantOnly || options.includeCoTenantSignatureTags,
  ).length
  const hasDocusealTags = tagPlacements.length >= minWidgetTags && pdfBufferHasDocusealTags(pdfBytes)

  return {
    pdfBytes,
    filledFieldNames,
    acroFormFieldCountAfterFlatten,
    hasDocusealTags,
    tagCount:
      tagPlacements.length +
      2 +
      (options.includeCoTenantSignatureTags ? 1 : 0),
    widgetTagCount: tagPlacements.length,
    widgetTagFieldNames: tagPlacements.map((p) => p.fieldName),
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
  }
}
