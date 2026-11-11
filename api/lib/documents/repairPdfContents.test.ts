import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { qpdfCheckBytes, repairPdfContents } from './repairPdfContents.js'

const fixturePath = join(process.cwd(), 'api/lib/documents/fixtures/submission-174-nsw-rta-signed.pdf')

function rasterBytes(pdf: string, page: number, dir: string, name: string): number {
  const prefix = join(dir, name)
  execFileSync('pdftoppm', ['-png', '-r', '30', '-f', String(page), '-l', String(page), pdf, prefix], {
    stdio: 'pipe',
  })
  const padded = String(page).padStart(2, '0')
  return readFileSync(join(dir, `${name}-${padded}.png`)).length
}

describe('signed PDF contents repair', () => {
  it('strips the null contents from submission 174 and passes qpdf', async () => {
    const broken = new Uint8Array(readFileSync(fixturePath))
    const repaired = await repairPdfContents(broken)
    expect(repaired.removed).toBeGreaterThan(0)
    const again = await repairPdfContents(repaired.bytes)
    expect(again.removed).toBe(0)
    expect(again.bytes).toBe(repaired.bytes)

    const check = qpdfCheckBytes(repaired.bytes)
    expect(check.available).toBe(true)
    expect(check.ok).toBe(true)
    expect(check.output).not.toMatch(/ignoring non-stream/i)

    const dir = mkdtempSync(join(tmpdir(), 'quni-174-'))
    const brokenPdf = join(dir, 'broken.pdf')
    const fixedPdf = join(dir, 'fixed.pdf')
    writeFileSync(brokenPdf, broken)
    writeFileSync(fixedPdf, repaired.bytes)
    for (const page of [1, 2, 3, 4, 5, 15]) {
      const brokenPng = rasterBytes(brokenPdf, page, dir, `b${page}`)
      const fixedPng = rasterBytes(fixedPdf, page, dir, `f${page}`)
      expect(fixedPng).toBeGreaterThan(brokenPng * 5)
    }
  }, 60_000)
})
