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

/** @deprecated Spanning dates removed — use OFFICIAL_FT6600_DATE_COMPONENT_DEFS. */
export const OFFICIAL_FT6600_DATE_FORMAT = 'DD/MM/YYYY' as const

/** Target ink height class on executed PDFs (submission 146 browser baseline). */
export const OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT = 32.4 as const

/** Dry-run test signature raster aspect (400×143px canvas in nsw-ft6600-execution-dry-run.mjs). */
export const OFFICIAL_FT6600_SPIKE_TEST_SIGNATURE_IMAGE_ASPECT = 400 / 143

/** Left edge of day/month/year boxes — signature ink must not extend past this. */
export const OFFICIAL_FT6600_DATE_COLUMN_X_PT = 251.9 as const

/** DocuSeal text field sized for drawn inner box (not full AcroForm widget height). */
export const OFFICIAL_FT6600_DATE_FIELD_HEIGHT_PT = 11 as const
export const OFFICIAL_FT6600_DATE_FIELD_TOP_MARGIN_PT = 2 as const
export const OFFICIAL_FT6600_DATE_FIELD_LEFT_INSET_PT = 4 as const

export type SignatureWidgetPlacement = {
  fieldName: string
  pageIndex: number
  x: number
  y: number
  width: number
  height: number
}

export type Ft6600DateComponentDef = {
  acro: string
  label: string
}

export type Ft6600DateRowDef = {
  dateRowKey: string
  role: 'First Party' | 'Second Party' | 'Co-tenant'
  coTenantOnly?: boolean
  components: readonly Ft6600DateComponentDef[]
}

/** Three text fields per execution date row — day numeral, month name, 2-digit year. */
export const OFFICIAL_FT6600_DATE_ROW_DEFS: readonly Ft6600DateRowDef[] = [
  {
    dateRowKey: 'landlord_sig_date',
    role: 'First Party',
    components: [
      { acro: 'landlord_sig_day', label: 'Landlord Sign Day' },
      { acro: 'landlord_sig_month', label: 'Landlord Sign Month' },
      { acro: 'landlord_sig_year', label: 'Landlord Sign Year' },
    ],
  },
  {
    dateRowKey: 'landlord_lis_sig_date',
    role: 'First Party',
    components: [
      { acro: 'landlord_lis_sig_day', label: 'Landlord LIS Sign Day' },
      { acro: 'landlord_lis_sig_month', label: 'Landlord LIS Sign Month' },
      { acro: 'landlord_lis_sig_year', label: 'Landlord LIS Sign Year' },
    ],
  },
  {
    dateRowKey: 'tenant_1_sig_date',
    role: 'Second Party',
    components: [
      { acro: 'tenant_1_sig_day', label: 'Tenant Sign Day' },
      { acro: 'tenant_1_sig_month', label: 'Tenant Sign Month' },
      { acro: 'tenant_1_sig_year', label: 'Tenant Sign Year' },
    ],
  },
  {
    dateRowKey: 'tenant_2_sig_date',
    role: 'Co-tenant',
    coTenantOnly: true,
    components: [
      { acro: 'tenant_2_sig_day', label: 'Tenant 2 Sign Day' },
      { acro: 'tenant_2_sig_month', label: 'Tenant 2 Sign Month' },
      { acro: 'tenant_2_sig_year', label: 'Tenant 2 Sign Year' },
    ],
  },
  {
    dateRowKey: 'tenant_tis_sig_date',
    role: 'Second Party',
    components: [
      { acro: 'tenant_tis_sig_day', label: 'Tenant TIS Sign Day' },
      { acro: 'tenant_tis_sig_month', label: 'Tenant TIS Sign Month' },
      { acro: 'tenant_tis_sig_year', label: 'Tenant TIS Sign Year' },
    ],
  },
]

/** Spike / API dry-run values for three-field date proof. */
export const OFFICIAL_FT6600_SPIKE_DATE_COMPONENT_VALUES = {
  day: '6',
  month: 'July',
  year: '26',
} as const

/** A DocuSeal field value pre-filled and locked so the signer never has to enter it. */
export type Ft6600PrefilledField = { name: string; default_value: string; readonly: true }

/** Addendum execution date field names (react-pdf addendum tags), by signing party. */
export const OFFICIAL_FT6600_ADDENDUM_DATE_FIELDS = {
  firstParty: 'Addendum Landlord Date',
  secondParty: 'Addendum Tenant Date',
} as const

const FT6600_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * Split a signing date into the FT6600 three-box components (day numeral, full
 * month name, 2-digit year) plus the addendum DD/MM/YYYY string. Computed in the
 * Australia/Sydney calendar so it matches the execution date the signer sees.
 */
export function officialFt6600SigningDateParts(date: Date = new Date()): {
  day: string
  month: string
  year: string
  ddmmyyyy: string
} {
  const dtf = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const parts = dtf.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const day = get('day')
  const month = get('month')
  const yearFull = get('year')
  const monthIndex = FT6600_MONTH_NAMES.indexOf(month as (typeof FT6600_MONTH_NAMES)[number])
  const dd = day.padStart(2, '0')
  const mm = String(monthIndex + 1).padStart(2, '0')
  return { day, month, year: yearFull.slice(-2), ddmmyyyy: `${dd}/${mm}/${yearFull}` }
}

/**
 * Read-only, pre-filled execution-date field values so signers only sign — the
 * date is stamped for them. Keyed by DocuSeal party (First Party = landlord,
 * Second Party = tenant, Co-tenant). Covers all four FT6600 rows plus the
 * addendum date on each party's side. Geometry is untouched — this only supplies
 * values for the existing frozen fields.
 */
export function officialFt6600ReadonlyDateFieldValues(
  date: Date = new Date(),
  options: { includeCoTenant: boolean } = { includeCoTenant: false },
): {
  firstParty: Ft6600PrefilledField[]
  secondParty: Ft6600PrefilledField[]
  coTenant: Ft6600PrefilledField[]
} {
  const { day, month, year, ddmmyyyy } = officialFt6600SigningDateParts(date)
  const firstParty: Ft6600PrefilledField[] = []
  const secondParty: Ft6600PrefilledField[] = []
  const coTenant: Ft6600PrefilledField[] = []

  const bucketFor = (role: Ft6600DateRowDef['role']) =>
    role === 'First Party' ? firstParty : role === 'Second Party' ? secondParty : coTenant

  for (const row of OFFICIAL_FT6600_DATE_ROW_DEFS) {
    if (row.coTenantOnly && !options.includeCoTenant) continue
    const bucket = bucketFor(row.role)
    for (const component of row.components) {
      const value = component.acro.endsWith('_day')
        ? day
        : component.acro.endsWith('_month')
          ? month
          : year
      bucket.push({ name: component.label, default_value: value, readonly: true })
    }
  }

  firstParty.push({
    name: OFFICIAL_FT6600_ADDENDUM_DATE_FIELDS.firstParty,
    default_value: ddmmyyyy,
    readonly: true,
  })
  secondParty.push({
    name: OFFICIAL_FT6600_ADDENDUM_DATE_FIELDS.secondParty,
    default_value: ddmmyyyy,
    readonly: true,
  })

  return { firstParty, secondParty, coTenant }
}

/** @deprecated Use OFFICIAL_FT6600_DATE_ROW_DEFS */
export const OFFICIAL_FT6600_DATE_FIELD_TRIPLETS: Record<string, readonly [string, string, string]> =
  Object.fromEntries(
    OFFICIAL_FT6600_DATE_ROW_DEFS.map((row) => [
      row.dateRowKey,
      row.components.map((c) => c.acro) as [string, string, string],
    ]),
  )

/**
 * DocuSeal parser unlock anchors — sole 14pt tag for primary landlord/tenant signatures.
 * One-off PDF submissions render every tag area; never duplicate names at different coords.
 */
export const OFFICIAL_FT6600_PARSER_ANCHOR_STYLE = {
  size: 14,
  color: rgb(0, 0, 0),
} as const

const PARSER_ANCHOR_FIELD_DEFS = [
  { fieldName: 'sig_landlord', label: 'Landlord Signature', role: 'First Party' as const },
  { fieldName: 'sig_tenant_1', label: 'Tenant Signature', role: 'Second Party' as const },
  {
    fieldName: 'sig_tenant_2',
    label: 'Tenant 2 Signature',
    role: 'Co-tenant' as const,
    coTenantOnly: true,
  },
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

type WidgetSignatureDef = {
  fieldName: string
  label: string
  role: 'First Party' | 'Second Party' | 'Co-tenant'
  coTenantOnly?: boolean
}

const WIDGET_SIGNATURE_DEFS: WidgetSignatureDef[] = [
  { fieldName: 'sig_landlord', label: 'Landlord Signature', role: 'First Party' },
  { fieldName: 'sig_landlord_lis', label: 'Landlord LIS Signature', role: 'First Party' },
  { fieldName: 'sig_tenant_1', label: 'Tenant Signature', role: 'Second Party' },
  {
    fieldName: 'sig_tenant_2',
    label: 'Tenant 2 Signature',
    role: 'Co-tenant',
    coTenantOnly: true,
  },
  { fieldName: 'sig_tenant_tis', label: 'Tenant TIS Signature', role: 'Second Party' },
]

function ft6600SignatureTag(label: string, role: string, widthPt: number, heightPt: number): string {
  const w = Math.round(widthPt)
  const h = Math.round(heightPt * 10) / 10
  return `{{${label};role=${role};type=signature;width=${w};height=${h}}}`
}

function ft6600DateComponentTag(label: string, role: string, width: number, height: number): string {
  const w = Math.round(width)
  const h = Math.round(height)
  return `{{${label};role=${role};type=text;width=${w};height=${h}}}`
}

export function officialFt6600DateFieldDimensions(widget: SignatureWidgetPlacement): {
  widthPt: number
  heightPt: number
  xPt: number
  yPt: number
} {
  const widthPt = Math.round(widget.width - OFFICIAL_FT6600_DATE_FIELD_LEFT_INSET_PT)
  const heightPt = OFFICIAL_FT6600_DATE_FIELD_HEIGHT_PT
  const xPt = widget.x + OFFICIAL_FT6600_DATE_FIELD_LEFT_INSET_PT
  const yPt = widget.y + widget.height - OFFICIAL_FT6600_DATE_FIELD_TOP_MARGIN_PT - heightPt
  return { widthPt, heightPt, xPt, yPt }
}

export function officialFt6600SignatureTagDimensions(widget: SignatureWidgetPlacement): {
  widthPt: number
  heightPt: number
} {
  return {
    widthPt: widget.width,
    heightPt: OFFICIAL_FT6600_SIGNATURE_INK_HEIGHT_PT,
  }
}

/** DocuSeal API burn-in uses ~50% of field width for signature image placement. */
export const OFFICIAL_FT6600_DOCUSEAL_SIG_IMAGE_WIDTH_FRACTION = 0.5 as const

/** Aspect-fit ink height: min(rect height, effective width ÷ image aspect). */
export function predictFt6600AspectFitInkHeight(
  rectWidthPt: number,
  rectHeightPt: number,
  imageAspect: number = OFFICIAL_FT6600_SPIKE_TEST_SIGNATURE_IMAGE_ASPECT,
  widthFraction: number = OFFICIAL_FT6600_DOCUSEAL_SIG_IMAGE_WIDTH_FRACTION,
): number {
  const effectiveWidth = rectWidthPt * widthFraction
  return Math.min(rectHeightPt, effectiveWidth / imageAspect)
}

export function countExpectedFt6600WidgetTags(includeCoTenantSignatureTags: boolean): number {
  const sigCount = WIDGET_SIGNATURE_DEFS.filter(
    (d) => !d.coTenantOnly || includeCoTenantSignatureTags,
  ).filter((d) => !PARSER_ONLY_SIGNATURE_FIELD_NAMES.has(d.fieldName)).length
  const dateCount = OFFICIAL_FT6600_DATE_ROW_DEFS.filter(
    (d) => !d.coTenantOnly || includeCoTenantSignatureTags,
  ).reduce((n, row) => n + row.components.length, 0)
  return sigCount + dateCount
}

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

/** All signing placements from live AcroForm widgets (signatures + date components). */
export function collectOfficialNswFt6600SigningPlacements(
  doc: PDFDoc,
  options: { includeCoTenantSignatureTags: boolean },
): SignatureWidgetPlacement[] {
  const sigFieldNames = WIDGET_SIGNATURE_DEFS.filter(
    (d) => !d.coTenantOnly || options.includeCoTenantSignatureTags,
  ).map((d) => d.fieldName)

  const acroNames = new Set<string>(sigFieldNames)
  for (const row of OFFICIAL_FT6600_DATE_ROW_DEFS) {
    if (row.coTenantOnly && !options.includeCoTenantSignatureTags) continue
    for (const part of row.components) acroNames.add(part.acro)
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
  for (const row of OFFICIAL_FT6600_DATE_ROW_DEFS) {
    if (row.coTenantOnly && !options.includeCoTenantSignatureTags) continue
    for (const { acro } of row.components) {
      const w = byField.get(acro)
      if (w) out.push(w)
    }
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

function placementFromDateDrawnBox(
  w: SignatureWidgetPlacement,
  style: typeof OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  tag: string,
): DocusealTagPlacement {
  const { xPt, yPt } = officialFt6600DateFieldDimensions(w)
  return {
    tag,
    fieldName: w.fieldName,
    pageIndex: w.pageIndex,
    x: xPt,
    y: yPt,
    size: style.size,
    color: style.color,
  }
}

function placementFromWidget(
  w: SignatureWidgetPlacement,
  style: typeof OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  tag: string,
  kind: 'signature' | 'date_component',
): DocusealTagPlacement {
  if (kind === 'date_component') {
    return placementFromDateDrawnBox(w, style, tag)
  }
  const yOffset = w.height * 0.35
  return {
    tag,
    fieldName: w.fieldName,
    pageIndex: w.pageIndex,
    x: w.x + 4,
    y: w.y + yOffset,
    size: style.size,
    color: style.color,
  }
}

const DATE_COMPONENT_ACROS = new Set(
  OFFICIAL_FT6600_DATE_ROW_DEFS.flatMap((row) => row.components.map((c) => c.acro)),
)

function placementKindForField(fieldName: string): 'signature' | 'date_component' {
  return DATE_COMPONENT_ACROS.has(fieldName) ? 'date_component' : 'signature'
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

  for (const def of WIDGET_SIGNATURE_DEFS) {
    if (def.coTenantOnly && !includeCoTenantSignatureTags) continue
    if (PARSER_ONLY_SIGNATURE_FIELD_NAMES.has(def.fieldName)) continue
    const w = byField.get(def.fieldName)
    if (!w) continue
    const { widthPt, heightPt } = officialFt6600SignatureTagDimensions(w)
    const tag = ft6600SignatureTag(def.label, def.role, widthPt, heightPt)
    placements.push(placementFromWidget(w, style, tag, 'signature'))
  }

  for (const row of OFFICIAL_FT6600_DATE_ROW_DEFS) {
    if (row.coTenantOnly && !includeCoTenantSignatureTags) continue
    for (const component of row.components) {
      const w = byField.get(component.acro)
      if (!w) continue
      const { widthPt, heightPt } = officialFt6600DateFieldDimensions(w)
      const tag = ft6600DateComponentTag(component.label, row.role, widthPt, heightPt)
      placements.push(placementFromWidget(w, style, tag, 'date_component'))
    }
  }

  return placements
}

/** Signature tag rects must end before the printed date column (stamp containment). */
export function assertFt6600SignatureTagsClearDateColumn(placements: DocusealTagPlacement[]): void {
  const marginPt = 8
  for (const p of placements) {
    if (!p.tag.includes('type=signature')) continue
    const widthMatch = p.tag.match(/width=(\d+(?:\.\d+)?)/)
    if (!widthMatch) continue
    const tagWidth = Number(widthMatch[1])
    const rightEdge = p.x + tagWidth
    if (rightEdge > OFFICIAL_FT6600_DATE_COLUMN_X_PT - marginPt) {
      throw new Error(
        `Signature tag ${p.fieldName} right edge ${rightEdge} overlaps date column at x=${OFFICIAL_FT6600_DATE_COLUMN_X_PT}`,
      )
    }
  }
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
    const kind = placementKindForField(p.fieldName)
    const sourceForAssert =
      kind === 'date_component'
        ? (() => {
            const dims = officialFt6600DateFieldDimensions(source)
            return {
              fieldName: source.fieldName,
              pageIndex: source.pageIndex,
              x: dims.xPt,
              y: dims.yPt,
              width: dims.widthPt,
              height: dims.heightPt,
            }
          })()
        : source
    const tol = kind === 'signature' ? 6 : 2
    if (p.x < sourceForAssert.x - tol || p.x > sourceForAssert.x + sourceForAssert.width + tol) {
      throw new Error(
        `Tag ${p.fieldName} x=${p.x} outside source x=[${sourceForAssert.x}, ${sourceForAssert.x + sourceForAssert.width}]`,
      )
    }
    if (p.y < sourceForAssert.y - tol || p.y > sourceForAssert.y + sourceForAssert.height + tol) {
      throw new Error(
        `Tag ${p.fieldName} y=${p.y} outside source y=[${sourceForAssert.y}, ${sourceForAssert.y + sourceForAssert.height}]`,
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
  for (const p of buildParserAnchorTagPlacements(sourceWidgets, options)) {
    const page = doc.getPages()[p.pageIndex]
    if (!page) continue
    page.drawText(p.tag, {
      x: p.x,
      y: p.y,
      size: p.size,
      font,
      color: p.color,
    })
  }
}

export function buildParserAnchorTagPlacements(
  sourceWidgets: SignatureWidgetPlacement[],
  options: { includeCoTenantSignatureTags: boolean },
): DocusealTagPlacement[] {
  const style = OFFICIAL_FT6600_PARSER_ANCHOR_STYLE
  const byField = new Map(sourceWidgets.map((w) => [w.fieldName, w]))
  const placements: DocusealTagPlacement[] = []
  for (const def of PARSER_ANCHOR_FIELD_DEFS) {
    if ('coTenantOnly' in def && def.coTenantOnly && !options.includeCoTenantSignatureTags) continue
    const w = byField.get(def.fieldName)
    if (!w) continue
    const { widthPt, heightPt } = officialFt6600SignatureTagDimensions(w)
    const tag = ft6600SignatureTag(def.label, def.role, widthPt, heightPt)
    placements.push({
      tag,
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
  const parserTagPlacements = buildParserAnchorTagPlacements(
    signingPlacementsBeforeFlatten,
    options,
  )
  assertDocusealTagPlacementsWithinSourceWidgets(tagPlacements, signingPlacementsBeforeFlatten)
  assertFt6600SignatureTagsClearDateColumn([...tagPlacements, ...parserTagPlacements])

  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  const acroFormFieldCountAfterFlatten = 0
  const phase1Bytes = await saveNormalizedPdf(doc)
  const docWithAnchors = await PDFDocument.load(phase1Bytes, { ignoreEncryption: true, updateMetadata: false })
  drawParserAnchorTags(docWithAnchors, signingPlacementsBeforeFlatten, options, font)
  const pdfBytes = await saveNormalizedPdf(docWithAnchors)
  const minWidgetTags = countExpectedFt6600WidgetTags(options.includeCoTenantSignatureTags)
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
