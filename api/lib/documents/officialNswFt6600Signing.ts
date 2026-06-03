/**
 * DocuSeal signing tags on the official NSW FT6600 after schedule fill + flatten.
 * Widget style matches production sigHint (refined-b-v2 baseline): 7pt #6b7280.
 */
import { PDFDocument, StandardFonts, rgb, type PDFDocument as PDFDoc, type PDFFont, type RGB } from 'pdf-lib'
import type { NswResidentialTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  applyOfficialNswFt6600ScheduleFill,
  loadOfficialNswFt6600Template,
  type OfficialNswFt6600FillResult,
} from './officialNswFt6600Fill.js'

/** Production NswResidentialTenancyAgreement sigHint — refined-b-v2 spike baseline. */
export const OFFICIAL_FT6600_WIDGET_TAG_STYLE = {
  size: 7,
  color: rgb(0.42, 0.45, 0.5),
} as const

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
  pageIndex: number
  x: number
  y: number
  size: number
  color: RGB
}

/** Production tag strings (First Party / Second Party / Co-tenant) — same as react-pdf NSW. */
const BASE_SIGNATURE_TAGS: Array<{ tag: string; role: 'First Party' | 'Second Party' | 'Co-tenant' }> = [
  { tag: '{{Landlord Signature;role=First Party;type=signature}}', role: 'First Party' },
  { tag: '{{Landlord Sign Date;role=First Party;type=date}}', role: 'First Party' },
  { tag: '{{Landlord LIS Signature;role=First Party;type=signature}}', role: 'First Party' },
  { tag: '{{Landlord LIS Date;role=First Party;type=date}}', role: 'First Party' },
  { tag: '{{Tenant Signature;role=Second Party;type=signature}}', role: 'Second Party' },
  { tag: '{{Tenant Sign Date;role=Second Party;type=date}}', role: 'Second Party' },
]

const CO_TENANT_SIGNATURE_TAGS: Array<{ tag: string; role: 'Co-tenant' }> = [
  { tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}', role: 'Co-tenant' },
  { tag: '{{Tenant 2 Sign Date;role=Co-tenant;type=date}}', role: 'Co-tenant' },
]

const TAIL_SIGNATURE_TAGS: Array<{ tag: string; role: 'Second Party' }> = [
  { tag: '{{Tenant TIS Signature;role=Second Party;type=signature}}', role: 'Second Party' },
  { tag: '{{Tenant TIS Date;role=Second Party;type=date}}', role: 'Second Party' },
]

/** Co-tenant widget tags on prescribed form (between primary tenant sign date and TIS). */
const CO_TENANT_MANUAL_PLACEMENTS = [
  { pageIndex: 16, x: 34, y: 488, height: 36 },
  { pageIndex: 16, x: 34, y: 448, height: 28 },
] as const

/** Third parser anchor (page 16 margin) — unlocks Co-tenant role; net-new vs two-party green. */
const PARSER_ANCHOR_CO_TENANT = { x: 12, y: 50 } as const

export function collectOfficialNswFt6600SignatureWidgets(doc: PDFDoc): SignatureWidgetPlacement[] {
  const out: SignatureWidgetPlacement[] = []
  for (const field of doc.getForm().getFields()) {
    const name = field.getName()
    if (!/signature/i.test(name)) continue
    const widgets = field.acroField.getWidgets()
    widgets.forEach((widget) => {
      const rect = widget.getRectangle()
      let pageIndex: number | null = null
      const pages = doc.getPages()
      for (let i = 0; i < pages.length; i++) {
        const annots = pages[i].node.Annots?.()
        if (!annots) continue
        const widgetRef = (widget as unknown as { ref?: unknown }).ref
        for (let j = 0; j < annots.size(); j++) {
          if (widgetRef != null && annots.get(j) === widgetRef) pageIndex = i
        }
      }
      if (pageIndex == null) pageIndex = 16
      out.push({
        fieldName: name,
        pageIndex,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    })
  }
  return out.sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex
    return b.y - a.y
  })
}

/** Widget-level tags only — same index mapping as refined-b-v2 spike (`mapWidgetsToTags`). */
function buildWidgetTagPlacements(
  widgets: SignatureWidgetPlacement[],
  includeCoTenantSignatureTags: boolean,
): DocusealTagPlacement[] {
  const tagDefs = [
    ...BASE_SIGNATURE_TAGS,
    ...(includeCoTenantSignatureTags ? CO_TENANT_SIGNATURE_TAGS : []),
    ...TAIL_SIGNATURE_TAGS,
  ]
  const sigOnly = widgets.filter((w) => w.pageIndex != null)
  const style = OFFICIAL_FT6600_WIDGET_TAG_STYLE
  const placements: DocusealTagPlacement[] = []

  let widgetIdx = 0
  let coTenantManualIdx = 0

  for (let i = 0; i < tagDefs.length; i++) {
    const def = tagDefs[i]

    if (
      includeCoTenantSignatureTags &&
      def.role === 'Co-tenant' &&
      coTenantManualIdx < CO_TENANT_MANUAL_PLACEMENTS.length
    ) {
      const manual = CO_TENANT_MANUAL_PLACEMENTS[coTenantManualIdx++]
      placements.push({
        tag: def.tag,
        pageIndex: manual.pageIndex,
        x: manual.x + 4,
        y: manual.y + manual.height * 0.35,
        size: style.size,
        color: style.color,
      })
      continue
    }

    let w = sigOnly[widgetIdx]
    if (widgetIdx < sigOnly.length) {
      widgetIdx++
    } else {
      const anchor = sigOnly[sigOnly.length - 1] ?? sigOnly[0]
      if (!anchor) break
      w = {
        ...anchor,
        y: anchor.y - (i - sigOnly.length + 1) * 20,
      }
    }

    placements.push({
      tag: def.tag,
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
  const { filledFieldNames } = applyOfficialNswFt6600ScheduleFill(doc, props)
  const signatureWidgetsBeforeFlatten = collectOfficialNswFt6600SignatureWidgets(doc)

  doc.getForm().flatten()

  const tagPlacements = buildWidgetTagPlacements(
    signatureWidgetsBeforeFlatten,
    options.includeCoTenantSignatureTags,
  )
  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  let acroFormFieldCountAfterFlatten = 0
  try {
    acroFormFieldCountAfterFlatten = doc.getForm().getFields().length
  } catch {
    acroFormFieldCountAfterFlatten = 0
  }

  // Two-step save: widget tags (phase 1) → reload → margin anchors only (phase 2).
  // Single-pass anchor draw did not unlock DocuSeal on full schedule fill (see executed-spike-source).
  const phase1Bytes = await doc.save({ useObjectStreams: false })
  const docAnchored = await PDFDocument.load(phase1Bytes, { ignoreEncryption: true })
  await applyMarginParserAnchors(docAnchored, {
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
  })
  const pdfBytes = await docAnchored.save({ useObjectStreams: false })
  const minTags =
    BASE_SIGNATURE_TAGS.length +
    TAIL_SIGNATURE_TAGS.length +
    (options.includeCoTenantSignatureTags ? CO_TENANT_SIGNATURE_TAGS.length : 0)
  const hasDocusealTags = tagPlacements.length >= minTags && pdfBufferHasDocusealTags(pdfBytes)

  return {
    pdfBytes,
    filledFieldNames,
    acroFormFieldCountAfterFlatten,
    hasDocusealTags,
    tagCount:
      tagPlacements.length +
      2 +
      (options.includeCoTenantSignatureTags ? 1 : 0),
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
  }
}
