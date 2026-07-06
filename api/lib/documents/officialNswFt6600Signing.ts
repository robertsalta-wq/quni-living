/**
 * DocuSeal signing tags on the official NSW FT6600 after schedule fill + flatten.
 * Widget style matches production sigHint (refined-b-v2 baseline): 7pt #6b7280.
 *
 * Placement geometry is derived at runtime from AcroForm widgets on ft6600-renamed.pdf
 * (pre-flatten). Do not use static ft6600-corrected-field-map.json coords for signing overlay.
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
import { findTextFieldWidgetPageIndex } from './officialNswFt6600BurnIn.js'
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

/** Human page 18 (0-based index 17) — TIS signature row. */
export const OFFICIAL_FT6600_TIS_PAGE_INDEX = 17

/** Human page 17 (0-based index 16) — landlord/tenant signature spread. */
export const OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX = 16

/** AU date format for DocuSeal date widgets on the official FT6600. */
export const OFFICIAL_FT6600_DATE_FORMAT = 'DD/MM/YYYY' as const

export type SignatureWidgetPlacement = {
  fieldName: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

/** Day + month + year AcroForm fields → one spanning DocuSeal date per signature row. */
export const OFFICIAL_FT6600_DATE_FIELD_TRIPLETS: Record<string, readonly [string, string, string]> = {
  landlord_sig_date: ['landlord_sig_day', 'landlord_sig_month', 'landlord_sig_year'],
  landlord_lis_sig_date: ['landlord_lis_sig_day', 'landlord_lis_sig_month', 'landlord_lis_sig_year'],
  tenant_1_sig_date: ['tenant_1_sig_day', 'tenant_1_sig_month', 'tenant_1_sig_year'],
  tenant_2_sig_date: ['tenant_2_sig_day', 'tenant_2_sig_month', 'tenant_2_sig_year'],
  tenant_tis_sig_date: ['tenant_tis_sig_day', 'tenant_tis_sig_month', 'tenant_tis_sig_year'],
}

/**
 * DocuSeal parser unlock anchors — sole 14pt tag for primary landlord/tenant signatures.
 * One-off PDF submissions render every tag area; never duplicate names at different coords.
 */
export const OFFICIAL_FT6600_PARSER_ANCHOR_STYLE = {
  size: 14,
  color: rgb(0, 0, 0),
} as const

const PARSER_ANCHOR_FIELD_DEFS = [
  { fieldName: 'sig_landlord', tag: '{{Landlord Signature;role=First Party;type=signature}}' },
  { fieldName: 'sig_tenant_1', tag: '{{Tenant Signature;role=Second Party;type=signature}}' },
  { fieldName: 'sig_tenant_2', tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}', coTenantOnly: true },
] as const

const PARSER_ONLY_SIGNATURE_FIELD_NAMES: Set<string> = new Set(
  PARSER_ANCHOR_FIELD_DEFS.map((d) => d.fieldName),
)

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
  fieldName: string
  coTenantOnly?: boolean
  kind: 'signature' | 'date'
  tag?: string
  dateLabel?: string
  dateRole?: string
}

function ft6600DateTag(label: string, role: string, width: number, height: number): string {
  const w = Math.round(width)
  const h = Math.round(height)
  return `{{${label};role=${role};type=date;format=${OFFICIAL_FT6600_DATE_FORMAT};width=${w};height=${h}}}`
}

const WIDGET_TAG_DEFS: WidgetTagDef[] = [
  { kind: 'signature', tag: '{{Landlord Signature;role=First Party;type=signature}}', fieldName: 'sig_landlord' },
  {
    kind: 'date',
    dateLabel: 'Landlord Sign Date',
    dateRole: 'First Party',
    fieldName: 'landlord_sig_date',
  },
  {
    kind: 'signature',
    tag: '{{Landlord LIS Signature;role=First Party;type=signature}}',
    fieldName: 'sig_landlord_lis',
  },
  {
    kind: 'date',
    dateLabel: 'Landlord LIS Date',
    dateRole: 'First Party',
    fieldName: 'landlord_lis_sig_date',
  },
  { kind: 'signature', tag: '{{Tenant Signature;role=Second Party;type=signature}}', fieldName: 'sig_tenant_1' },
  {
    kind: 'date',
    dateLabel: 'Tenant Sign Date',
    dateRole: 'Second Party',
    fieldName: 'tenant_1_sig_date',
  },
  {
    kind: 'signature',
    tag: '{{Tenant 2 Signature;role=Co-tenant;type=signature}}',
    fieldName: 'sig_tenant_2',
    coTenantOnly: true,
  },
  {
    kind: 'date',
    dateLabel: 'Tenant 2 Sign Date',
    dateRole: 'Co-tenant',
    fieldName: 'tenant_2_sig_date',
    coTenantOnly: true,
  },
  {
    kind: 'signature',
    tag: '{{Tenant TIS Signature;role=Second Party;type=signature}}',
    fieldName: 'sig_tenant_tis',
  },
  {
    kind: 'date',
    dateLabel: 'Tenant TIS Date',
    dateRole: 'Second Party',
    fieldName: 'tenant_tis_sig_date',
  },
]

function collectFieldWidgets(doc: PDFDoc, fieldNames: readonly string[]): SignatureWidgetPlacement[] {
  const wanted = new Set(fieldNames)
  const out: SignatureWidgetPlacement[] = []
  for (const field of doc.getForm().getFields()) {
    const name = field.getName()
    if (!wanted.has(name)) continue
    for (const widget of field.acroField.getWidgets()) {
      const rect = widget.getRectangle()
      const pageIndex = findTextFieldWidgetPageIndex(doc, widget) ?? OFFICIAL_FT6600_SIGNATURE_PAGE_INDEX
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

export function unionSignatureWidgetPlacements(
  fieldName: string,
  parts: SignatureWidgetPlacement[],
): SignatureWidgetPlacement {
  if (parts.length === 0) {
    throw new Error(`unionSignatureWidgetPlacements: no parts for ${fieldName}`)
  }
  const pageIndex = parts[0].pageIndex
  const left = Math.min(...parts.map((p) => p.x))
  const bottom = Math.min(...parts.map((p) => p.y))
  const right = Math.max(...parts.map((p) => p.x + p.width))
  const top = Math.max(...parts.map((p) => p.y + p.height))
  return {
    fieldName,
    pageIndex,
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
  }
}

/** All signing placements from live AcroForm widgets (signatures + date spans). */
export function collectOfficialNswFt6600SigningPlacements(
  doc: PDFDoc,
  options: { includeCoTenantSignatureTags: boolean },
): SignatureWidgetPlacement[] {
  const sigFieldNames = WIDGET_TAG_DEFS.filter(
    (d) => d.kind === 'signature' && (!d.coTenantOnly || options.includeCoTenantSignatureTags),
  ).map((d) => d.fieldName)
  const dateFieldNames = WIDGET_TAG_DEFS.filter(
    (d) => d.kind === 'date' && (!d.coTenantOnly || options.includeCoTenantSignatureTags),
  ).map((d) => d.fieldName)

  const acroNames = new Set<string>(sigFieldNames)
  for (const dateField of dateFieldNames) {
    const triplet = OFFICIAL_FT6600_DATE_FIELD_TRIPLETS[dateField]
    if (triplet) for (const part of triplet) acroNames.add(part)
  }

  const byField = new Map<string, SignatureWidgetPlacement>()
  for (const w of collectFieldWidgets(doc, [...acroNames])) {
    if (!byField.has(w.fieldName)) byField.set(w.fieldName, w)
  }

  const out: SignatureWidgetPlacement[] = []
  for (const name of sigFieldNames) {
    const w = byField.get(name)
    if (w) out.push(w)
  }
  for (const dateField of dateFieldNames) {
    const triplet = OFFICIAL_FT6600_DATE_FIELD_TRIPLETS[dateField]
    if (!triplet) continue
    const parts = triplet.map((n) => byField.get(n)).filter((w): w is SignatureWidgetPlacement => !!w)
    if (parts.length === 3) out.push(unionSignatureWidgetPlacements(dateField, parts))
  }
  return out
}

export function collectOfficialNswFt6600SignatureWidgets(doc: PDFDoc): SignatureWidgetPlacement[] {
  return collectFieldWidgets(doc, OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST)
}

/** @deprecated Use collectOfficialNswFt6600SigningPlacements */
export function collectOfficialNswFt6600SigningFieldWidgets(
  doc: PDFDoc,
  options: { includeCoTenantSignatureTags: boolean },
): SignatureWidgetPlacement[] {
  return collectOfficialNswFt6600SigningPlacements(doc, options).filter((w) =>
    OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST.includes(
      w.fieldName as (typeof OFFICIAL_FT6600_SIGNATURE_WIDGET_ALLOWLIST)[number],
    ),
  )
}

function placementFromWidget(
  w: SignatureWidgetPlacement,
  style: typeof OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  tag: string,
  kind: 'signature' | 'date',
): DocusealTagPlacement {
  const yOffset = kind === 'date' ? w.height * 0.2 : w.height * 0.35
  return {
    tag,
    fieldName: w.fieldName,
    pageIndex: w.pageIndex,
    x: w.x + (kind === 'signature' ? 4 : 0),
    y: w.y + yOffset,
    size: style.size,
    color: style.color,
  }
}

function widgetTagDefForField(fieldName: string): WidgetTagDef | undefined {
  return WIDGET_TAG_DEFS.find((d) => d.fieldName === fieldName)
}

/** Widget-level tags — placements must come from collectOfficialNswFt6600SigningPlacements. */
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
    if (def.kind === 'signature' && PARSER_ONLY_SIGNATURE_FIELD_NAMES.has(def.fieldName)) continue
    const w = byField.get(def.fieldName)
    if (!w) continue
    const tag =
      def.kind === 'date'
        ? ft6600DateTag(def.dateLabel!, def.dateRole!, w.width, w.height)
        : def.tag!
    placements.push(placementFromWidget(w, style, tag, def.kind))
  }

  return placements
}

/** Regression guard: every drawn tag anchor must sit inside its source widget rect. */
export function assertDocusealTagPlacementsWithinSourceWidgets(
  placements: DocusealTagPlacement[],
  sourceWidgets: SignatureWidgetPlacement[],
): void {
  const byField = new Map(sourceWidgets.map((w) => [w.fieldName, w]))
  for (const p of placements) {
    const source = byField.get(p.fieldName)
    if (!source) {
      throw new Error(`assertDocusealTagPlacementsWithinSourceWidgets: no source widget for ${p.fieldName}`)
    }
    const def = widgetTagDefForField(p.fieldName)
    const kind = def?.kind ?? 'signature'
    const tol = kind === 'signature' ? 6 : 2
    if (p.x < source.x - tol || p.x > source.x + source.width + tol) {
      throw new Error(
        `Tag ${p.fieldName} x=${p.x} outside source x=[${source.x}, ${source.x + source.width}]`,
      )
    }
    if (p.y < source.y - tol || p.y > source.y + source.height + tol) {
      throw new Error(
        `Tag ${p.fieldName} y=${p.y} outside source y=[${source.y}, ${source.y + source.height}]`,
      )
    }
  }
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

export function drawParserAnchorTags(
  doc: PDFDoc,
  sourceWidgets: SignatureWidgetPlacement[],
  options: { includeCoTenantSignatureTags: boolean },
  font: PDFFont,
): void {
  const style = OFFICIAL_FT6600_PARSER_ANCHOR_STYLE
  const pages = doc.getPages()
  const byField = new Map(sourceWidgets.map((w) => [w.fieldName, w]))
  for (const def of PARSER_ANCHOR_FIELD_DEFS) {
    if ('coTenantOnly' in def && def.coTenantOnly && !options.includeCoTenantSignatureTags) continue
    const w = byField.get(def.fieldName)
    if (!w) continue
    const page = pages[w.pageIndex]
    if (!page) continue
    page.drawText(def.tag, {
      x: w.x + 4,
      y: w.y + w.height * 0.35,
      size: style.size,
      font,
      color: style.color,
    })
  }
}

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

export async function buildOfficialNswFt6600PdfWithSigning(
  props: NswResidentialTenancyAgreementProps,
  options: { includeCoTenantSignatureTags: boolean },
): Promise<OfficialNswFt6600WithSigningResult> {
  const doc = await loadOfficialNswFt6600Template()
  const noBondStrikeBounds = prepareOfficialNswFt6600NoBondStrikeBounds(doc, props.bond.amount)
  const signingPlacementsBeforeFlatten = collectOfficialNswFt6600SigningPlacements(doc, options)
  const { filledFieldNames } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)

  flattenAndCleanForm(doc)
  applyOfficialNswFt6600NoBondStrikeOutIfNeeded(doc, props.bond.amount, noBondStrikeBounds)

  const tagPlacements = buildWidgetTagPlacements(signingPlacementsBeforeFlatten, options.includeCoTenantSignatureTags)
  assertDocusealTagPlacementsWithinSourceWidgets(tagPlacements, signingPlacementsBeforeFlatten)

  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  const acroFormFieldCountAfterFlatten = 0
  const phase1Bytes = await saveNormalizedPdf(doc)
  const docWithAnchors = await PDFDocument.load(phase1Bytes, { ignoreEncryption: true, updateMetadata: false })
  drawParserAnchorTags(docWithAnchors, signingPlacementsBeforeFlatten, options, font)
  const pdfBytes = await saveNormalizedPdf(docWithAnchors)
  const minWidgetTags = WIDGET_TAG_DEFS.filter(
    (d) => !d.coTenantOnly || options.includeCoTenantSignatureTags,
  ).filter((d) => !(d.kind === 'signature' && PARSER_ONLY_SIGNATURE_FIELD_NAMES.has(d.fieldName))).length
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
