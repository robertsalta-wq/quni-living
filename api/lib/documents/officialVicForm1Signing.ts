/**
 * DocuSeal signing tags on VIC Form 1 after M2 overlay fill (flat blank, no AcroForm).
 * Tag strings match src/lib/documents/vic/form1Generator.tsx / VicForm1Agreement.js.
 */
import { StandardFonts, type RGB } from 'pdf-lib'
import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'
import { bookingRequiresCoTenantSignature } from '../booking/coTenantSigning.js'
import {
  applyOfficialVicForm1FillToDocument,
  loadOfficialVicForm1BlankTemplate,
  loadVicForm1CoordinateMap,
  type VicForm1FillResult,
  type VicForm1MapField,
} from './officialVicForm1Fill.js'
import {
  drawWidgetDocusealTags,
  OFFICIAL_FT6600_WIDGET_TAG_STYLE,
  pdfBufferHasDocusealTags,
  type DocusealTagPlacement,
} from './officialNswFt6600Signing.js'

export { OFFICIAL_FT6600_WIDGET_TAG_STYLE as VIC_FORM1_SIGNING_TAG_STYLE }

type VicSigningTagDef = {
  tag: string
  fieldId: string
  coTenantOnly?: boolean
}

/** VIC Form 1 DocuSeal anchors — roles align with docuseal.shared.js submitter roles. */
export const VIC_FORM1_SIGNING_TAG_DEFS: VicSigningTagDef[] = [
  {
    tag: '{{Rental Provider Signature;role=First Party;type=signature}}',
    fieldId: 'signature.rentalProvider1',
  },
  {
    tag: '{{Rental Provider Sign Date;role=First Party;type=date}}',
    fieldId: 'signature.rentalProvider1Date',
  },
  {
    tag: '{{Renter Signature;role=Second Party;type=signature}}',
    fieldId: 'signature.renter1',
  },
  {
    tag: '{{Renter Sign Date;role=Second Party;type=date}}',
    fieldId: 'signature.renter1Date',
  },
  {
    tag: '{{Renter 2 Signature;role=Co-tenant;type=signature}}',
    fieldId: 'signature.renter2',
    coTenantOnly: true,
  },
  {
    tag: '{{Renter 2 Sign Date;role=Co-tenant;type=date}}',
    fieldId: 'signature.renter2Date',
    coTenantOnly: true,
  },
]

export type VicForm1DetectedDocusealTag = {
  tag: string
  label: string
  role: string
  type: string
  fieldId: string
  pageIndex: number
  x: number
  y: number
}

export type OfficialVicForm1WithSigningResult = Omit<VicForm1FillResult, 'pdfBytes'> & {
  pdfBytes: Uint8Array
  hasDocusealTags: boolean
  tagCount: number
  includeCoTenantSignatureTags: boolean
  widgetTagPlacements: Array<Pick<DocusealTagPlacement, 'tag' | 'fieldName' | 'pageIndex' | 'x' | 'y'>>
}

function fieldMapById(fields: VicForm1MapField[]): Map<string, VicForm1MapField> {
  return new Map(fields.map((f) => [f.id, f]))
}

function placementFromMapField(
  field: VicForm1MapField,
  tag: string,
  style: { size: number; color: RGB },
): DocusealTagPlacement {
  const [x0, y0, , y1] = field.rect_pdf
  const height = y1 - y0
  return {
    tag,
    fieldName: field.id,
    pageIndex: field.page - 1,
    x: x0 + 4,
    y: y0 + height * 0.35,
    size: style.size,
    color: style.color,
  }
}

export function expectedVicForm1SigningTags(includeCoTenantSignatureTags: boolean): string[] {
  return VIC_FORM1_SIGNING_TAG_DEFS.filter((d) => !d.coTenantOnly || includeCoTenantSignatureTags).map(
    (d) => d.tag,
  )
}

export function buildVicForm1SigningTagPlacements(
  fields: VicForm1MapField[],
  includeCoTenantSignatureTags: boolean,
): DocusealTagPlacement[] {
  const byId = fieldMapById(fields)
  const style = OFFICIAL_FT6600_WIDGET_TAG_STYLE
  const placements: DocusealTagPlacement[] = []

  for (const def of VIC_FORM1_SIGNING_TAG_DEFS) {
    if (def.coTenantOnly && !includeCoTenantSignatureTags) continue
    const field = byId.get(def.fieldId)
    if (!field) continue
    placements.push(placementFromMapField(field, def.tag, style))
  }

  return placements
}

/**
 * Co-tenant signing gate: booking row when available, else props.additionalTenantNames[0].
 */
export function resolveVicForm1IncludeCoTenantSignature(
  props: QldGeneralTenancyAgreementProps,
  booking?: { occupant_count?: number | null; co_tenant?: unknown } | null,
): boolean {
  if (booking) return bookingRequiresCoTenantSignature(booking)
  return Boolean(props.additionalTenantNames[0]?.trim())
}

const DOCUSEAL_TAG_RE = /^\{\{([^;]+);role=([^;]+);type=([^}]+)\}\}$/

export function parseDocusealTagString(tag: string): { label: string; role: string; type: string } | null {
  const m = tag.match(DOCUSEAL_TAG_RE)
  if (!m) return null
  return { label: m[1]!.trim(), role: m[2]!.trim(), type: m[3]!.trim() }
}

/** Read DocuSeal tag strings from a PDF page via pdfjs (post-compression safe). */
export async function extractVicForm1DocusealTagsFromPdfPage(
  pdfBytes: Uint8Array,
  pageNumber: number,
): Promise<VicForm1DetectedDocusealTag[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true }).promise
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  const defByTag = new Map(VIC_FORM1_SIGNING_TAG_DEFS.map((d) => [d.tag, d]))

  const found: VicForm1DetectedDocusealTag[] = []
  for (const item of content.items) {
    if (!('str' in item)) continue
    const raw = item.str.trim()
    if (!raw.startsWith('{{') || !raw.endsWith('}}')) continue
    const parsed = parseDocusealTagString(raw)
    if (!parsed) continue
    const def = defByTag.get(raw)
    found.push({
      tag: raw,
      label: parsed.label,
      role: parsed.role,
      type: parsed.type,
      fieldId: def?.fieldId ?? '',
      pageIndex: pageNumber - 1,
      x: item.transform[4],
      y: item.transform[5],
    })
  }

  await pdf.destroy()
  return found
}

export function assertVicForm1DocusealTagsExact(
  detected: VicForm1DetectedDocusealTag[],
  includeCoTenantSignatureTags: boolean,
): void {
  const expected = expectedVicForm1SigningTags(includeCoTenantSignatureTags)
  const detectedTags = detected.map((d) => d.tag).sort()
  const expectedSorted = [...expected].sort()

  if (detectedTags.length !== expectedSorted.length) {
    throw new Error(
      `DocuSeal tag count mismatch: expected ${expectedSorted.length}, found ${detectedTags.length} (${detectedTags.join(', ')})`,
    )
  }

  for (let i = 0; i < expectedSorted.length; i++) {
    if (detectedTags[i] !== expectedSorted[i]) {
      throw new Error(`DocuSeal tag mismatch at ${i}: expected ${expectedSorted[i]}, got ${detectedTags[i]}`)
    }
  }

  const allowedRoles = new Set(
    includeCoTenantSignatureTags
      ? ['First Party', 'Second Party', 'Co-tenant']
      : ['First Party', 'Second Party'],
  )
  for (const d of detected) {
    if (!allowedRoles.has(d.role)) {
      throw new Error(`Unexpected DocuSeal role "${d.role}" in tag ${d.tag}`)
    }
  }
}

/**
 * Fill VIC Form 1 schedule data, then overlay DocuSeal text-tag anchors at map signature cells.
 */
export async function buildOfficialVicForm1PdfWithSigning(
  props: QldGeneralTenancyAgreementProps,
  options: { includeCoTenantSignatureTags: boolean; root?: string },
): Promise<OfficialVicForm1WithSigningResult> {
  const root = options.root ?? process.cwd()
  const map = loadVicForm1CoordinateMap(root)
  const doc = await loadOfficialVicForm1BlankTemplate(root)
  const { filledFieldIds, gaps } = await applyOfficialVicForm1FillToDocument(doc, props, { root })

  const tagPlacements = buildVicForm1SigningTagPlacements(map.fields, options.includeCoTenantSignatureTags)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  drawWidgetDocusealTags(doc, tagPlacements, font)

  const pdfBytes = await doc.save()
  const minTags = expectedVicForm1SigningTags(options.includeCoTenantSignatureTags).length
  const hasDocusealTags = tagPlacements.length >= minTags && pdfBufferHasDocusealTags(pdfBytes)

  return {
    pdfBytes,
    filledFieldIds,
    gaps,
    hasDocusealTags,
    tagCount: tagPlacements.length,
    includeCoTenantSignatureTags: options.includeCoTenantSignatureTags,
    widgetTagPlacements: tagPlacements.map(({ tag, fieldName, pageIndex, x, y }) => ({
      tag,
      fieldName,
      pageIndex,
      x,
      y,
    })),
  }
}
