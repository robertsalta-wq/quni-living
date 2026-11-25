/**
 * Frozen CAV move-in documents given with the Victorian rooming house agreement.
 * LibreOffice did not keep the Word form fields, so notice values are drawn in the boxes.
 * Prescribed sentences are not rewritten.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export const VIC_ROOMING_MOVE_IN_FORM_REFERENCE = {
  rightsAndDuties: {
    title: 'Rights and duties of a rooming house resident',
    citation: 'Residential Tenancies Act 1997 Section 124',
    coreModified: '2025-11-28T05:04:00Z',
    lastModifiedBy: 'Tal Levitas (DGS)',
    sourceSha256: '958a2d508510d46fc6c726ff340f4982fb9342d70e1988d128e35e4293bb6a19',
    blankSha256: '66bf49897ea3ff466f7203a8d3f8d2a14e335ce06bde1ff6c894489ed610454e',
    pageCount: 1,
  },
  residentsGuide: {
    title: 'Rooming house residents guide',
    coreModified: '2026-10-12T05:41:00Z',
    creator: 'Consumer Affairs Victoria',
    lastModifiedBy: 'David M Darragh (DGS)',
    sourceSha256: '4367ddf774e71f70dfc75bca01adfadc4d08a132de9c7f03207127777f01749e',
    blankSha256: '37bdf33a57330f8f38318121a6c9ff89af3532e43f1b565b0b97d0339aaec415',
    pageCount: 6,
  },
  noticeExclusive: {
    title: 'Notice to prospective rooming house resident - Exclusive occupancy',
    citation: 'Residential Tenancies Act 1997 Section 92C',
    coreModified: '2021-03-10T00:02:00Z',
    lastModifiedBy: 'James J Latham (DJCS)',
    sourceSha256: '17b00efc5667ef6bb2c387939999bd64331f47121ac03b9f07386ecb6c44a073',
    blankSha256: 'a9fffb9cc738e3babd9457444d92732aae75d3edd70532b19957f61f53f85e1c',
    pageCount: 2,
  },
  noticeShared: {
    title: 'Notice to prospective rooming house resident - Shared room right',
    citation: 'Residential Tenancies Act 1997 Section 92C',
    coreModified: '2021-03-09T07:40:00Z',
    lastModifiedBy: 'Nicole A Rich (DJCS)',
    sourceSha256: 'b53c4cb6b978ca6505a994d7f7933faf017a878489f2201a66528c124c5bbd88',
    blankSha256: '68b6c447d2a03bca62fd790e61e23824757c7917241f65d2d4c721bf35d18622',
    pageCount: 2,
  },
} as const

const INK = rgb(0.1, 0.1, 0.12)
const PAPER = rgb(1, 1, 1)

type Box = { x: number; y: number; w: number; h: number }

/** Boxes measured from the frozen blanks. y is the bottom edge, in PDF points. */
const EXCLUSIVE = {
  date: { x: 45.65, y: 541.34, w: 106.8, h: 17 },
  residentName: { x: 45.35, y: 479.54, w: 521.9, h: 17 },
  address: { x: 45.35, y: 444.54, w: 400, h: 17 },
  postcode: { x: 498, y: 444.54, w: 66, h: 17 },
  roomNumber: { x: 45.65, y: 409.54, w: 106.8, h: 17 },
  operatorName: { x: 45.35, y: 251.34, w: 521.9, h: 17 },
  signature: { x: 45.35, y: 194.74, w: 253.1, h: 34 },
} as const satisfies Record<string, Box>

const SHARED = {
  date: { x: 45.65, y: 512.64, w: 106.8, h: 17 },
  residentName: { x: 45.35, y: 450.84, w: 521.9, h: 17 },
  address: { x: 45.35, y: 415.84, w: 400, h: 17 },
  postcode: { x: 498, y: 415.84, w: 66, h: 17 },
  roomNumber: { x: 45.65, y: 380.84, w: 75.6, h: 17 },
  peopleInRoom: { x: 45.65, y: 274.74, w: 75.6, h: 17 },
  sharedRent: { x: 56, y: 212.94, w: 80, h: 17 },
  sharedWeek: { x: 163.65, y: 215.79, w: 11.3, h: 11.3 },
  unsharedRent: { x: 56, y: 174.94, w: 80, h: 17 },
  unsharedWeek: { x: 163.65, y: 177.79, w: 11.3, h: 11.3 },
  operatorName: { x: 45.35, y: 113.14, w: 521.9, h: 17 },
  signature: { x: 45.35, y: 56.44, w: 253.1, h: 34 },
} as const satisfies Record<string, Box>

export type VicRoomingNoticeKind = 'exclusive' | 'shared'

export type VicRoomingNoticeFill = {
  kind: VicRoomingNoticeKind
  noticeDateLabel: string
  residentName: string
  address: string
  postcode: string
  roomNumber: string
  operatorName: string
  /** Listing field max_occupants. Shared notice only. */
  peopleInRoom: string
  /** Weekly rent on this booking. Shared notice only. */
  sharedWeeklyRent: string
  /** Weekly rent if the room were not shared. Shared notice only. */
  unsharedWeeklyRent: string
  signatureLabel: string
  signingTags?: boolean
}

function drawInBox(page: PDFPage, font: PDFFont, text: string, box: Box, size = 9) {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value) return
  let used = size
  while (used > 6 && font.widthOfTextAtSize(value, used) > box.w - 8) used -= 0.5
  const y = box.y + Math.max(2, (box.h - used) / 2)
  page.drawText(value.slice(0, 180), { x: box.x + 4, y, size: used, font, color: INK })
}

function tickBox(page: PDFPage, font: PDFFont, box: Box) {
  const size = 8
  const glyph = font.widthOfTextAtSize('X', size)
  page.drawText('X', {
    x: box.x + (box.w - glyph) / 2,
    y: box.y + (box.h - size * 0.72) / 2,
    size,
    font,
    color: INK,
  })
}

function drawSignature(page: PDFPage, font: PDFFont, box: Box, label: string, signingTags: boolean) {
  if (!signingTags) return
  const width = Math.round(box.w - 6)
  const height = Math.round(box.h - 4)
  page.drawText(`{{${label};role=First Party;type=signature;width=${width};height=${height}}}`, {
    x: box.x + 3,
    y: box.y + 4,
    size: 6,
    font,
    color: PAPER,
  })
}

export function readVicRoomingMoveInPdf(fileName: string): Uint8Array {
  return readFileSync(join(process.cwd(), 'docs/vic', fileName))
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function fillVicRoomingNotice(props: VicRoomingNoticeFill): Promise<{ pdfBytes: Uint8Array }> {
  const file =
    props.kind === 'shared'
      ? 'rooming-house-notice-shared-room.pdf'
      : 'rooming-house-notice-exclusive-occupancy.pdf'
  const doc = await PDFDocument.load(readVicRoomingMoveInPdf(file))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.getPages()[0]
  if (!page) throw new Error('The rooming house notice PDF has no pages')
  const boxes = props.kind === 'shared' ? SHARED : EXCLUSIVE
  const signingTags = props.signingTags !== false
  drawInBox(page, font, props.noticeDateLabel, boxes.date)
  drawInBox(page, font, props.residentName, boxes.residentName)
  drawInBox(page, font, props.address, boxes.address)
  drawInBox(page, font, props.postcode, boxes.postcode, 8)
  drawInBox(page, font, props.roomNumber, boxes.roomNumber)
  drawInBox(page, font, props.operatorName, boxes.operatorName)
  if (props.kind === 'shared') {
    drawInBox(page, font, props.peopleInRoom, SHARED.peopleInRoom)
    drawInBox(page, font, props.sharedWeeklyRent, SHARED.sharedRent)
    if (props.sharedWeeklyRent.trim()) tickBox(page, font, SHARED.sharedWeek)
    drawInBox(page, font, props.unsharedWeeklyRent, SHARED.unsharedRent)
    if (props.unsharedWeeklyRent.trim()) tickBox(page, font, SHARED.unsharedWeek)
  }
  drawSignature(page, font, boxes.signature, props.signatureLabel, signingTags)
  return { pdfBytes: await doc.save() }
}
