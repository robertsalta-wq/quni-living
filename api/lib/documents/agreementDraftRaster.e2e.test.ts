/**
 * Fresh drafts for every agreement type and addendum.
 * qpdf --check the whole file, then raster page 1 (and the FT6600 schedule pages)
 * against the unsigned draft so a blank page fails. A null injected into /Contents
 * must blank the page, and the repair must restore the unsigned raster.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import React from 'react'
import { PDFArray, PDFDocument, PDFName, PDFNull } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { qpdfCheckBytes, repairPdfContents } from './repairPdfContents.js'

globalThis.React = React

type Draft = { name: string; bytes: Uint8Array; pages: number[] }

async function loadDrafts(): Promise<Draft[]> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const fixtures = await import('../../../scripts/agreement-sample-fixtures.mjs')
  const { NswLicenceToOccupyOnSite } = await import('../../../src/lib/documents/nsw/occupancyGenerator.tsx')
  const { QldLicenceToOccupyOnSite } = await import('../../../src/lib/documents/qld/occupancyGenerator.tsx')
  const { VicLicenceToOccupyOnSite } = await import('../../../src/lib/documents/vic/occupancyGenerator.tsx')
  const { NswBoardingHouseOccupancyAgreement } = await import(
    '../../../src/lib/documents/nsw/boardingHouse/generator.tsx'
  )
  const { VicResidentialRentalAgreementForm1 } = await import('../../../src/lib/documents/vic/form1Generator.tsx')
  const { QuniPlatformAddendum } = await import('../../../src/lib/documents/QuniPlatformAddendum.tsx')
  const { QuniPlatformAddendumQld } = await import('../../../src/lib/documents/QuniPlatformAddendumQld.tsx')
  const { QuniPlatformAddendumVic } = await import('../../../src/lib/documents/vic/addendumGenerator.tsx')
  const { fillOfficialNswFt6600Pdf } = await import('./officialNswFt6600Fill.js')
  const { fillOfficialQldForm18aPdf } = await import('./officialQldForm18aFill.js')
  const { fillOfficialQldFormR18Pdf } = await import('./officialQldFormR18Fill.js')
  const { qldFormR18SampleFillProps } = await import('./qldFormR18SampleProps.js')

  async function reactPdf(Component: unknown, props: unknown): Promise<Uint8Array> {
    const buf = await renderToBuffer(React.createElement(Component as never, props as never))
    return new Uint8Array(buf)
  }

  const ft6600 = await fillOfficialNswFt6600Pdf(fixtures.nswT2AgreementSampleProps())
  const form18a = await fillOfficialQldForm18aPdf(fixtures.qldT2AgreementSampleProps())
  const formR18 = await fillOfficialQldFormR18Pdf(qldFormR18SampleFillProps())

  return [
    { name: 'NSW occupancy', bytes: await reactPdf(NswLicenceToOccupyOnSite, fixtures.nswOccupancySampleProps()), pages: [1] },
    { name: 'NSW FT6600', bytes: ft6600.pdfBytes, pages: [1, 2, 3, 4, 5, 15] },
    { name: 'NSW boarding house', bytes: await reactPdf(NswBoardingHouseOccupancyAgreement, fixtures.nswT3BoardingHouseSampleProps()), pages: [1] },
    { name: 'QLD occupancy', bytes: await reactPdf(QldLicenceToOccupyOnSite, fixtures.qldOccupancySampleProps()), pages: [1] },
    { name: 'QLD Form 18a', bytes: form18a.pdfBytes, pages: [1] },
    { name: 'QLD Form R18', bytes: formR18.pdfBytes, pages: [1] },
    { name: 'VIC occupancy', bytes: await reactPdf(VicLicenceToOccupyOnSite, fixtures.vicOccupancySampleProps()), pages: [1] },
    { name: 'VIC Form 1', bytes: await reactPdf(VicResidentialRentalAgreementForm1, fixtures.vicT2AgreementSampleProps()), pages: [1] },
    { name: 'NSW addendum', bytes: await reactPdf(QuniPlatformAddendum, fixtures.nswAddendumSampleProps()), pages: [1] },
    { name: 'QLD addendum', bytes: await reactPdf(QuniPlatformAddendumQld, fixtures.qldAddendumSampleProps()), pages: [1] },
    { name: 'VIC addendum', bytes: await reactPdf(QuniPlatformAddendumVic, fixtures.vicAddendumSampleProps()), pages: [1] },
  ]
}

async function injectNullContents(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  for (const page of doc.getPages()) {
    const key = PDFName.of('Contents')
    const looked = page.node.lookup(key)
    if (looked instanceof PDFArray) {
      const next = PDFArray.withContext(doc.context)
      next.push(PDFNull)
      for (let i = 0; i < looked.size(); i += 1) next.push(looked.get(i))
      next.push(PDFNull)
      page.node.set(key, next)
      continue
    }
    const existing = page.node.get(key)
    const arr = PDFArray.withContext(doc.context)
    arr.push(PDFNull)
    if (existing) arr.push(existing)
    arr.push(PDFNull)
    page.node.set(key, arr)
  }
  return doc.save({ useObjectStreams: false })
}

function raster(pdf: string, page: number, dir: string, name: string): number {
  const safe = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  const prefix = join(dir, safe)
  execFileSync('pdftoppm', ['-png', '-r', '30', '-f', String(page), '-l', String(page), pdf, prefix], {
    stdio: 'pipe',
  })
  const padded = String(page).padStart(2, '0')
  const candidates = [`${safe}-${padded}.png`, `${safe}-${page}.png`, `${safe}.png`]
  for (const file of candidates) {
    const full = join(dir, file)
    try {
      return readFileSync(full).length
    } catch {
      /* try the next poppler name */
    }
  }
  throw new Error(`no raster for ${safe} page ${page}`)
}

describe('agreement drafts stay paintable', () => {
  it('checks every agreement and addendum, and a null contents entry blanks the page', async () => {
    const drafts = await loadDrafts()
    expect(drafts).toHaveLength(11)
    const dir = mkdtempSync(join(tmpdir(), 'quni-drafts-'))

    for (const draft of drafts) {
      const check = qpdfCheckBytes(draft.bytes)
      expect(check.available, draft.name).toBe(true)
      expect(check.ok, `${draft.name}\n${check.output}`).toBe(true)

      const broken = await injectNullContents(draft.bytes)
      const repaired = await repairPdfContents(broken)
      expect(repaired.removed, draft.name).toBeGreaterThan(0)
      const repairedCheck = qpdfCheckBytes(repaired.bytes)
      expect(repairedCheck.ok, `${draft.name} repaired\n${repairedCheck.output}`).toBe(true)

      const unsignedPath = join(dir, `${draft.name.replace(/\s+/g, '-')}-unsigned.pdf`)
      const brokenPath = join(dir, `${draft.name.replace(/\s+/g, '-')}-broken.pdf`)
      const fixedPath = join(dir, `${draft.name.replace(/\s+/g, '-')}-fixed.pdf`)
      writeFileSync(unsignedPath, draft.bytes)
      writeFileSync(brokenPath, broken)
      writeFileSync(fixedPath, repaired.bytes)

      const pageCount = (await PDFDocument.load(draft.bytes)).getPageCount()
      for (const page of draft.pages) {
        if (page > pageCount) continue
        const unsigned = raster(unsignedPath, page, dir, `${draft.name}-u${page}`)
        const blank = raster(brokenPath, page, dir, `${draft.name}-b${page}`)
        const fixed = raster(fixedPath, page, dir, `${draft.name}-f${page}`)
        expect(unsigned, `${draft.name} page ${page} unsigned`).toBeGreaterThan(4000)
        expect(blank, `${draft.name} page ${page} should blank`).toBeLessThan(unsigned * 0.45)
        expect(fixed, `${draft.name} page ${page} repaired`).toBeGreaterThan(unsigned * 0.7)
      }
    }
  }, 300_000)
})
