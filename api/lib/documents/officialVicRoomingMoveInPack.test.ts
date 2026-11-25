import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'
import {
  fillVicRoomingNotice,
  VIC_ROOMING_MOVE_IN_FORM_REFERENCE,
} from './officialVicRoomingMoveInPack.js'

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(join(process.cwd(), file))).digest('hex')
}

async function textOf(bytes: Uint8Array): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(bytes), disableWorker: true }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return parts.join('\n')
}

describe('frozen CAV move-in documents', () => {
  it('pins the section 124 statement to the 90-day file', async () => {
    const ref = VIC_ROOMING_MOVE_IN_FORM_REFERENCE.rightsAndDuties
    expect(sha256('docs/vic/rooming-house-rights-and-duties-s124.docx')).toBe(ref.sourceSha256)
    expect(sha256('docs/vic/rooming-house-rights-and-duties-s124.pdf')).toBe(ref.blankSha256)
    const text = await textOf(readFileSync('docs/vic/rooming-house-rights-and-duties-s124.pdf'))
    expect(text).toMatch(/valid 90-day notice/)
    expect(text).not.toMatch(/60-day notice/)
    expect(text).not.toMatch(/\(02\/21\)/)
    expect(text).toMatch(/14 days/)
    expect(text).toMatch(/2 days/)
  })

  it('pins the guide and both notices', () => {
    expect(sha256('docs/vic/rooming-house-residents-guide.docx')).toBe(
      VIC_ROOMING_MOVE_IN_FORM_REFERENCE.residentsGuide.sourceSha256,
    )
    expect(sha256('docs/vic/rooming-house-notice-exclusive-occupancy.docx')).toBe(
      VIC_ROOMING_MOVE_IN_FORM_REFERENCE.noticeExclusive.sourceSha256,
    )
    expect(sha256('docs/vic/rooming-house-notice-shared-room.docx')).toBe(
      VIC_ROOMING_MOVE_IN_FORM_REFERENCE.noticeShared.sourceSha256,
    )
  })
})

describe('fillVicRoomingNotice', () => {
  const common = {
    noticeDateLabel: '25/11/2026',
    residentName: 'Sam Resident',
    address: '1 Example Street, Carlton, VIC',
    postcode: '3053',
    roomNumber: '4',
    operatorName: 'Ada Operator',
  }

  it('fills an exclusive notice and places the operator signature tag', async () => {
    const { pdfBytes } = await fillVicRoomingNotice({
      ...common,
      kind: 'exclusive',
      peopleInRoom: '',
      sharedWeeklyRent: '',
      signatureLabel: 'Operator notice signature',
    })
    const text = await textOf(pdfBytes)
    expect(text).toContain('Sam Resident')
    expect(text).toContain('exclusive occupancy right')
    expect(text).toContain('{{Operator notice signature;role=First Party;type=signature;')
  })

  it('fills the shared notice from the listing and leaves the exclusive-room rent blank', async () => {
    const { pdfBytes } = await fillVicRoomingNotice({
      ...common,
      kind: 'shared',
      peopleInRoom: '9',
      sharedWeeklyRent: '350.00',
      signatureLabel: 'Operator notice signature',
      signingTags: false,
    })
    const text = await textOf(pdfBytes)
    expect(text).toContain('350.00')
    expect(text).toContain('shared room right')
    expect(text).not.toContain('{{')
    const doc = await getDocument({ data: new Uint8Array(pdfBytes), disableWorker: true }).promise
    const page = await doc.getPage(1)
    const content = await page.getTextContent()
    const people = content.items.find((item) => 'str' in item && item.str === '9')
    const rent = content.items.find((item) => 'str' in item && item.str === '350.00')
    expect(people && 'transform' in people ? people.transform[5] : 0).toBeGreaterThan(274)
    expect(people && 'transform' in people ? people.transform[5] : 999).toBeLessThan(292)
    expect(rent && 'transform' in rent ? rent.transform[5] : 0).toBeGreaterThan(212)
    expect(rent && 'transform' in rent ? rent.transform[5] : 999).toBeLessThan(230)
  })
})
