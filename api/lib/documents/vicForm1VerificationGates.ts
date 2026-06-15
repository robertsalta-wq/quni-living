/**
 * VIC Form 1 verification gates — SHA pin, raster region diff, bbox read-back, checkboxes, overflow, signing.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { QldGeneralTenancyAgreementProps } from '../../documents/rtaTypes.js'
import {
  buildVicForm1FillPlan,
  fillOfficialVicForm1Pdf,
  OFFICIAL_VIC_FORM1_BLANK_REL,
  type VicForm1FieldAssignment,
  type VicForm1MapField,
} from './officialVicForm1Fill.js'
import {
  buildOfficialVicForm1PdfWithSigning,
  buildVicForm1SigningTagPlacements,
  expectedVicForm1SigningTags,
  extractVicForm1DocusealTagsFromPdfPage,
  type VicForm1DetectedDocusealTag,
} from './officialVicForm1Signing.js'
import { vicForm1RepresentativeFixtureProps } from './vicForm1RepresentativeFixture.js'
import {
  cleanupRasterTmp,
  rasterizePdfBytesToPngPaths,
  VIC_FORM1_RASTER_DPI,
} from './vicForm1PdftoppmRaster.js'

export type VicForm1MapFieldFull = VicForm1MapField & {
  rect_top: [number, number, number, number]
  split?: string
}

export type VicForm1CoordinateMapFull = {
  sourcePdfSha256: string
  pageCount: number
  pageSize: { width: number; height: number }
  fields: VicForm1MapFieldFull[]
}

export type VicForm1GateResult = {
  gate: string
  pass: boolean
  detail?: string
  /** Gate 1 only — out-of-region pixel count per 1-based page (must all be 0). */
  outOfRegionPixelsByPage?: Record<number, number>
}

const FIELD_RECT_PAD_PTS = 4
const CHECKBOX_DIFF_THRESHOLD = 8
const BBOX_TOLERANCE_PTS = 6
const SIGNING_TAG_TOLERANCE_PTS = 6

export function loadVicForm1CoordinateMapFull(root = process.cwd()): VicForm1CoordinateMapFull {
  const raw = JSON.parse(
    fs.readFileSync(path.join(root, 'docs', 'vic', 'vic-form1-coordinate-map.json'), 'utf8'),
  ) as VicForm1CoordinateMapFull
  return raw
}

export function assertVicForm1BlankPdfSha256Pinned(root = process.cwd()): string {
  const map = loadVicForm1CoordinateMapFull(root)
  const blankPath = path.join(root, OFFICIAL_VIC_FORM1_BLANK_REL)
  const bytes = fs.readFileSync(blankPath)
  const sha = createHash('sha256').update(bytes).digest('hex')
  if (sha !== map.sourcePdfSha256) {
    throw new Error(
      `VIC Form 1 blank PDF sha256 mismatch (got ${sha}, map expects ${map.sourcePdfSha256})`,
    )
  }
  return sha
}

function scalePtsToRaster(value: number, dpi: number): number {
  return value * (dpi / 72)
}

/** Mark allowed-change pixels from coordinate map field rects (rect_top, top-origin). */
export function buildAllowedChangeMask(
  width: number,
  height: number,
  pageFields: VicForm1MapFieldFull[],
  dpi: number,
  padPts = FIELD_RECT_PAD_PTS,
): Uint8Array {
  const mask = new Uint8Array(width * height)
  const pad = scalePtsToRaster(padPts, dpi)

  for (const field of pageFields) {
    const [x0, top, x1, bottom] = field.rect_top
    const rx0 = Math.max(0, Math.floor(scalePtsToRaster(x0, dpi) - pad))
    const ry0 = Math.max(0, Math.floor(scalePtsToRaster(top, dpi) - pad))
    const rx1 = Math.min(width, Math.ceil(scalePtsToRaster(x1, dpi) + pad))
    const ry1 = Math.min(height, Math.ceil(scalePtsToRaster(bottom, dpi) + pad))

    for (let y = ry0; y < ry1; y++) {
      const row = y * width
      for (let x = rx0; x < rx1; x++) {
        mask[row + x] = 1
      }
    }
  }

  return mask
}

type RawPng = { data: Buffer; width: number; height: number; channels: number }

async function loadRawPng(pngPath: string): Promise<RawPng> {
  const sharp = (await import('sharp')).default
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

function pixelsDiffer(a: RawPng, b: RawPng, px: number): boolean {
  const ai = px * a.channels
  const bi = px * b.channels
  return a.data[ai] !== b.data[bi] || a.data[ai + 1] !== b.data[bi + 1] || a.data[ai + 2] !== b.data[bi + 2]
}

/** Compare filled vs blank PNG pair; count differing pixels outside the allowed mask. */
export async function countOutOfRegionDiffPixels(
  filledPngPath: string,
  blankPngPath: string,
  mask: Uint8Array,
): Promise<{ outOfRegion: number; totalDiff: number }> {
  const filled = await loadRawPng(filledPngPath)
  const blank = await loadRawPng(blankPngPath)

  if (filled.width !== blank.width || filled.height !== blank.height) {
    throw new Error(
      `PNG size mismatch: ${filled.width}x${filled.height} vs ${blank.width}x${blank.height}`,
    )
  }
  if (mask.length !== filled.width * filled.height) {
    throw new Error(`Mask size ${mask.length} != image ${filled.width * filled.height}`)
  }

  const total = filled.width * filled.height
  let outOfRegion = 0
  let totalDiff = 0

  for (let px = 0; px < total; px++) {
    if (!pixelsDiffer(filled, blank, px)) continue
    totalDiff++
    if (!mask[px]) outOfRegion++
  }

  return { outOfRegion, totalDiff }
}

export async function runFilledVsBlankRegionDiffGate(
  filledPdfBytes: Uint8Array,
  root: string,
  map = loadVicForm1CoordinateMapFull(root),
): Promise<VicForm1GateResult> {
  assertVicForm1BlankPdfSha256Pinned(root)

  const blankBytes = fs.readFileSync(path.join(root, OFFICIAL_VIC_FORM1_BLANK_REL))
  const dpi = VIC_FORM1_RASTER_DPI

  const filledRaster = rasterizePdfBytesToPngPaths(filledPdfBytes, { repoRoot: root, dpi })
  const blankRaster = rasterizePdfBytesToPngPaths(blankBytes, { repoRoot: root, dpi })

  try {
    if (filledRaster.pngPaths.length !== blankRaster.pngPaths.length) {
      return {
        gate: 'filled-vs-blank region diff',
        pass: false,
        detail: `page count ${filledRaster.pngPaths.length} vs ${blankRaster.pngPaths.length}`,
      }
    }

    const outOfRegionPixelsByPage: Record<number, number> = {}
    let failDetail: string | undefined

    for (let i = 0; i < filledRaster.pngPaths.length; i++) {
      const pageNum = i + 1
      const pageFields = map.fields.filter((f) => f.page === pageNum)
      const filledRaw = await loadRawPng(filledRaster.pngPaths[i]!)
      const mask = buildAllowedChangeMask(filledRaw.width, filledRaw.height, pageFields, dpi)
      const { outOfRegion, totalDiff } = await countOutOfRegionDiffPixels(
        filledRaster.pngPaths[i]!,
        blankRaster.pngPaths[i]!,
        mask,
      )
      outOfRegionPixelsByPage[pageNum] = outOfRegion
      if (outOfRegion > 0 && !failDetail) {
        failDetail = `page ${pageNum}: ${outOfRegion} diff pixel(s) outside allowed field rects (${totalDiff} total diff)`
      }
    }

    const pass = Object.values(outOfRegionPixelsByPage).every((n) => n === 0)
    return {
      gate: 'filled-vs-blank region diff',
      pass,
      detail: pass ? undefined : failDetail,
      outOfRegionPixelsByPage,
    }
  } finally {
    cleanupRasterTmp(filledRaster.tmpDir)
    cleanupRasterTmp(blankRaster.tmpDir)
  }
}

export type PdfTextItem = {
  str: string
  x: number
  y: number
  width: number
  height: number
  page: number
}

export async function extractPdfTextItems(pdfBytes: Uint8Array): Promise<PdfTextItem[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true }).promise
  const items: PdfTextItem[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const tr = item.transform
      const fontSize = Math.abs(tr[3] ?? 10)
      items.push({
        str: item.str,
        x: tr[4] ?? 0,
        y: tr[5] ?? 0,
        width: item.width ?? fontSize * item.str.length * 0.5,
        height: fontSize,
        page: pageNum,
      })
    }
  }

  await pdf.destroy()
  return items
}

function bboxInsideRect(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  rect: [number, number, number, number],
  tolerance = BBOX_TOLERANCE_PTS,
): boolean {
  const [rx0, ry0, rx1, ry1] = rect
  return (
    bbox.x0 >= rx0 - tolerance &&
    bbox.y0 >= ry0 - tolerance &&
    bbox.x1 <= rx1 + tolerance &&
    bbox.y1 <= ry1 + tolerance
  )
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase()
}

function itemBboxPdf(item: PdfTextItem): { x0: number; y0: number; x1: number; y1: number } {
  const ascent = item.height * 0.85
  const descent = item.height * 0.15
  return {
    x0: item.x,
    y0: item.y - descent,
    x1: item.x + item.width,
    y1: item.y + ascent,
  }
}

function fieldTextReadBack(
  items: PdfTextItem[],
  field: VicForm1MapFieldFull,
  expected: string,
): { ok: boolean; reason?: string } {
  const [rx0, ry0, rx1, ry1] = field.rect_pdf
  const inRect = items.filter((it) => {
    if (it.page !== field.page) return false
    const tol = Math.max(BBOX_TOLERANCE_PTS, it.height * 0.5)
    const bb = itemBboxPdf(it)
    return (
      bb.x0 >= rx0 - tol &&
      bb.x1 <= rx1 + tol &&
      bb.y0 >= ry0 - tol &&
      bb.y1 <= ry1 + tol
    )
  })

  const extracted = normalizeText(inRect.map((it) => it.str).join(' '))
  const expNorm = normalizeText(expected)

  if (!extracted) {
    return { ok: false, reason: 'no text items fully inside field rect' }
  }

  const textMatches =
    extracted.includes(expNorm) ||
    expNorm.includes(extracted) ||
    (expNorm.length > 20 && expNorm.startsWith(extracted))

  if (!textMatches) {
    return { ok: false, reason: `text mismatch (got "${extracted.slice(0, 40)}…")` }
  }

  for (const it of inRect) {
    const bb = itemBboxPdf(it)
    const tol = Math.max(BBOX_TOLERANCE_PTS, it.height * 0.35)
    if (!bboxInsideRect(bb, field.rect_pdf, tol)) {
      return {
        ok: false,
        reason: `glyph "${it.str}" bbox outside rect_pdf [${field.rect_pdf.join(',')}]`,
      }
    }
  }

  if (field.split === 'postcode_of_pair') {
    const postcodeItems = inRect.filter((it) => /\d/.test(it.str))
    for (const it of postcodeItems.length > 0 ? postcodeItems : inRect) {
      if (!bboxInsideRect(itemBboxPdf(it), field.rect_pdf, BBOX_TOLERANCE_PTS)) {
        return { ok: false, reason: 'postcode outside postcode sub-rect' }
      }
    }
  }

  if (field.split === 'address_of_pair') {
    const addressItems = inRect.filter((it) => !/^\d{4}$/.test(it.str.trim()))
    for (const it of addressItems.length > 0 ? addressItems : inRect) {
      if (!bboxInsideRect(itemBboxPdf(it), field.rect_pdf, BBOX_TOLERANCE_PTS)) {
        return { ok: false, reason: 'address outside address sub-rect' }
      }
    }
  }

  return { ok: true }
}

function assignmentTextForField(
  fieldId: string,
  assignments: Map<string, VicForm1FieldAssignment>,
): string | null {
  const a = assignments.get(fieldId)
  return a?.text?.trim() || null
}

export async function runPerSlotCoordinateReadBackGate(
  filledPdfBytes: Uint8Array,
  props: QldGeneralTenancyAgreementProps,
  root: string,
  map = loadVicForm1CoordinateMapFull(root),
): Promise<VicForm1GateResult> {
  assertVicForm1BlankPdfSha256Pinned(root)

  const plan = buildVicForm1FillPlan(props)
  const items = await extractPdfTextItems(filledPdfBytes)
  const failures: string[] = []

  for (const field of map.fields) {
    if (field.type === 'checkbox' || field.type === 'signature') continue

    const expected = assignmentTextForField(field.id, plan.assignments)
    if (!expected) continue

    const readBack = fieldTextReadBack(items, field, expected)
    if (!readBack.ok) {
      failures.push(`${field.id}: ${readBack.reason}`)
    }
  }

  return {
    gate: 'per-slot coordinate read-back',
    pass: failures.length === 0,
    detail: failures.length ? failures.slice(0, 5).join('; ') + (failures.length > 5 ? ` (+${failures.length - 5} more)` : '') : undefined,
  }
}

async function checkboxTickedViaRaster(
  filledPngPath: string,
  blankPngPath: string,
  field: VicForm1MapFieldFull,
  dpi: number,
): Promise<boolean> {
  const filled = await loadRawPng(filledPngPath)
  const blank = await loadRawPng(blankPngPath)
  const [x0, top, x1, bottom] = field.rect_top
  const pad = scalePtsToRaster(2, dpi)
  const rx0 = Math.max(0, Math.floor(scalePtsToRaster(x0, dpi) - pad))
  const ry0 = Math.max(0, Math.floor(scalePtsToRaster(top, dpi) - pad))
  const rx1 = Math.min(filled.width, Math.ceil(scalePtsToRaster(x1, dpi) + pad))
  const ry1 = Math.min(filled.height, Math.ceil(scalePtsToRaster(bottom, dpi) + pad))

  let diff = 0
  for (let y = ry0; y < ry1; y++) {
    for (let x = rx0; x < rx1; x++) {
      const px = y * filled.width + x
      if (pixelsDiffer(filled, blank, px)) diff++
    }
  }
  return diff >= CHECKBOX_DIFF_THRESHOLD
}

export async function runCheckboxCorrectnessGate(
  filledPdfBytes: Uint8Array,
  props: QldGeneralTenancyAgreementProps,
  root: string,
  map = loadVicForm1CoordinateMapFull(root),
): Promise<VicForm1GateResult> {
  assertVicForm1BlankPdfSha256Pinned(root)

  const plan = buildVicForm1FillPlan(props)
  const blankBytes = fs.readFileSync(path.join(root, OFFICIAL_VIC_FORM1_BLANK_REL))
  const dpi = VIC_FORM1_RASTER_DPI

  const filledRaster = rasterizePdfBytesToPngPaths(filledPdfBytes, { repoRoot: root, dpi })
  const blankRaster = rasterizePdfBytesToPngPaths(blankBytes, { repoRoot: root, dpi })

  try {
    const failures: string[] = []
    const checkboxes = map.fields.filter((f) => f.type === 'checkbox')

    for (const field of checkboxes) {
      const shouldBeTicked = Boolean(plan.assignments.get(field.id)?.checked)
      const pageIdx = field.page - 1
      const ticked = await checkboxTickedViaRaster(
        filledRaster.pngPaths[pageIdx]!,
        blankRaster.pngPaths[pageIdx]!,
        field,
        dpi,
      )
      if (ticked !== shouldBeTicked) {
        failures.push(`${field.id}: expected ${shouldBeTicked ? 'ticked' : 'unticked'}, got ${ticked ? 'ticked' : 'unticked'}`)
      }
    }

    return {
      gate: 'checkbox correctness',
      pass: failures.length === 0,
      detail: failures.length ? failures.join('; ') : undefined,
    }
  } finally {
    cleanupRasterTmp(filledRaster.tmpDir)
    cleanupRasterTmp(blankRaster.tmpDir)
  }
}

export type OverflowCaseResult = {
  case: string
  pass: boolean
  detail?: string
  continuationRequired?: boolean
}

function cloneProps(base: QldGeneralTenancyAgreementProps): QldGeneralTenancyAgreementProps {
  return structuredClone(base)
}

export function vicForm1OverflowFixtures(): Array<{ name: string; props: QldGeneralTenancyAgreementProps }> {
  const base = vicForm1RepresentativeFixtureProps()

  const longName = cloneProps(base)
  longName.tenant.fullName =
    'Bartholomew Montgomery-Fitzgerald-Whitmore the Third Esquire of Carlton North'

  const longAddress = cloneProps(base)
  longAddress.tenant.addressForServiceLine =
    'Unit 42, Level 9, The Grand Residential Towers, 888 Extremely Long Boulevard Name Extended, Carlton North, VIC, 3054'

  const longPayment = cloneProps(base)
  longPayment.rentPaymentBankDetails = {
    bsb: '063-000',
    accountNumber: '9876543210987654',
    accountName: 'Quinnvestments Pty Ltd Trading As Very Long Business Name Holdings',
    bankName: 'Commonwealth Bank of Australia Melbourne CBD Branch',
  }
  longPayment.rentPaymentPreference = 'quni_platform'

  const longItem21 = cloneProps(base)
  const item21Paragraph =
    'This is an intentionally verbose special condition that repeats policy language about occupancy limits, guest stays, noise curfews, balcony use, shared facilities, insurance obligations, maintenance reporting timelines, key return procedures, end-of-lease cleaning standards, and inspection access windows. '
  longItem21.specialConditions = Array.from({ length: 12 }, (_, i) => `${item21Paragraph}(paragraph ${i + 1}).`)
  longItem21.bookingNotes =
    'Overflow test booking note appended to item 21 further details block for verification suite coverage — must exceed the eight-line box and require a continuation sheet in the booking flow.'

  return [
    { name: 'long renter name', props: longName },
    { name: 'long current address', props: longAddress },
    { name: 'long payment-details block', props: longPayment },
    { name: 'long item 21 note', props: longItem21 },
  ]
}

/** True when item 21 text was truncated — booking flow should attach a continuation sheet. */
export function detectItem21Continuation(
  props: QldGeneralTenancyAgreementProps,
  items: PdfTextItem[],
  map: VicForm1CoordinateMapFull,
): boolean {
  const plan = buildVicForm1FillPlan(props)
  const full = plan.assignments.get('additionalTerms.furtherDetails')?.text?.trim() ?? ''
  if (!full) return false

  const field = map.fields.find((f) => f.id === 'additionalTerms.furtherDetails')
  if (!field) return false

  const pageText = normalizeText(items.filter((it) => it.page === field.page).map((it) => it.str).join(' '))
  const fullNorm = normalizeText(full)

  const startAnchor = fullNorm.slice(0, 48)
  const endAnchor = fullNorm.slice(-48)
  const hasStart = pageText.includes(startAnchor)
  const hasEnd = pageText.includes(endAnchor)

  return hasStart && !hasEnd && fullNorm.length > 900
}

export async function runOverflowFixturesGate(root: string): Promise<VicForm1GateResult & { cases: OverflowCaseResult[] }> {
  assertVicForm1BlankPdfSha256Pinned(root)
  const map = loadVicForm1CoordinateMapFull(root)
  const cases: OverflowCaseResult[] = []

  for (const { name, props } of vicForm1OverflowFixtures()) {
    const { pdfBytes } = await fillOfficialVicForm1Pdf(props, { root })
    const regionResult = await runFilledVsBlankRegionDiffGate(pdfBytes, root, map)

    let continuationRequired: boolean | undefined
    if (name === 'long item 21 note') {
      const items = await extractPdfTextItems(pdfBytes)
      continuationRequired = detectItem21Continuation(props, items, map)
    }

    const pass =
      regionResult.pass &&
      (name !== 'long item 21 note' || continuationRequired === true)

    cases.push({
      case: name,
      pass,
      detail: !regionResult.pass
        ? regionResult.detail
        : name === 'long item 21 note' && !continuationRequired
          ? 'item 21 overflow did not truncate or flag continuation'
          : undefined,
      continuationRequired,
    })
  }

  return {
    gate: 'overflow fixtures',
    pass: cases.every((c) => c.pass),
    detail: cases.filter((c) => !c.pass).map((c) => `${c.case}: ${c.detail}`).join('; ') || undefined,
    cases,
  }
}

function assertTagsAtMappedCells(
  detected: VicForm1DetectedDocusealTag[],
  includeCoTenant: boolean,
  map: VicForm1CoordinateMapFull,
): string[] {
  const failures: string[] = []
  const placements = buildVicForm1SigningTagPlacements(map.fields, includeCoTenant)
  const byTag = new Map(detected.map((d) => [d.tag, d]))

  for (const placement of placements) {
    const det = byTag.get(placement.tag)
    if (!det) {
      failures.push(`missing tag ${placement.tag}`)
      continue
    }
    const field = map.fields.find((f) => f.id === placement.fieldName)
    if (!field) continue

    const dx = Math.abs(det.x - placement.x)
    const dy = Math.abs(det.y - placement.y)
    if (dx > SIGNING_TAG_TOLERANCE_PTS || dy > SIGNING_TAG_TOLERANCE_PTS) {
      failures.push(
        `${placement.tag}: position (${det.x.toFixed(1)},${det.y.toFixed(1)}) vs expected (${placement.x.toFixed(1)},${placement.y.toFixed(1)})`,
      )
    }
    if (det.pageIndex !== placement.pageIndex) {
      failures.push(`${placement.tag}: pageIndex ${det.pageIndex} vs ${placement.pageIndex}`)
    }
  }

  const expectedTags = expectedVicForm1SigningTags(includeCoTenant)
  if (detected.length !== expectedTags.length) {
    failures.push(`tag count ${detected.length} vs ${expectedTags.length}`)
  }

  return failures
}

export async function runSigningSmokeGate(
  props: QldGeneralTenancyAgreementProps,
  includeCoTenant: boolean,
  root: string,
  map = loadVicForm1CoordinateMapFull(root),
): Promise<VicForm1GateResult> {
  assertVicForm1BlankPdfSha256Pinned(root)

  const result = await buildOfficialVicForm1PdfWithSigning(props, {
    includeCoTenantSignatureTags: includeCoTenant,
    root,
  })
  const detected = await extractVicForm1DocusealTagsFromPdfPage(result.pdfBytes, 8)
  const failures = assertTagsAtMappedCells(detected, includeCoTenant, map)

  for (const d of detected) {
    const parsedRole = d.role
    const allowed = includeCoTenant
      ? ['First Party', 'Second Party', 'Co-tenant']
      : ['First Party', 'Second Party']
    if (!allowed.includes(parsedRole)) {
      failures.push(`unexpected role ${parsedRole} on ${d.tag}`)
    }
  }

  const label = includeCoTenant ? 'signing smoke (3 signers)' : 'signing smoke (2 signers)'
  return {
    gate: label,
    pass: failures.length === 0,
    detail: failures.length ? failures.join('; ') : undefined,
  }
}

export function formatGateReport(results: VicForm1GateResult[]): string {
  const lines = ['VIC Form 1 verification suite', '']
  for (const r of results) {
    lines.push(`${r.pass ? 'PASS' : 'FAIL'}  ${r.gate}`)
    if (r.outOfRegionPixelsByPage) {
      for (const [page, count] of Object.entries(r.outOfRegionPixelsByPage).sort(
        (a, b) => Number(a[0]) - Number(b[0]),
      )) {
        lines.push(`       page ${page}: out-of-region pixels = ${count}`)
      }
    }
    if (r.detail) lines.push(`       ${r.detail}`)
  }
  return lines.join('\n')
}
