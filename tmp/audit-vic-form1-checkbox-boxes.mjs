/**
 * Count LO-exported FORMCHECKBOX squares in VIC Form 1 blank PDF.
 * Checkboxes are ~10.5pt closed paths (pdfjs constructPath op 20, 13 coords).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFParse } from 'pdf-parse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const pdfPath =
  process.argv[2] ??
  path.join(root, 'tmp', 'vic-form1-freeze-artifact', 'extracted', 'docs', 'vic', 'form-1-blank.pdf')

const BOX_TEXT_RE = /[\u2610\u2611\u2612\u25A1\u25A0\u274F\u2751\u25FB\u25FC□☐☑☒▢▣]/g

/** @param {Float32Array | number[]} seg */
function parseCheckboxSegment(seg) {
  // LO FORMCHECKBOX: closed path 0,x1,y1,1,x2,y2,1,x3,y3,1,x4,y4,3
  if (!seg || seg.length < 13) return null

  const pts = []
  for (let i = 0; i < 12; i += 3) {
    const x = seg[i + 1]
    const y = seg[i + 2]
    if (typeof x === 'number' && typeof y === 'number') pts.push({ x, y })
  }
  if (pts.length < 4) return null

  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX
  const h = maxY - minY

  if (w < 8 || w > 14 || h < 8 || h > 14) return null
  if (Math.max(w, h) / Math.min(w, h) > 1.25) return null

  return { minX, minY, maxX, maxY, w, h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/**
 * @param {import('pdfjs-dist')} pdfjs
 * @param {Uint8Array} data
 */
async function countCheckboxSquaresPerPage(pdfjs, data) {
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const perPage = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const viewport = page.getViewport({ scale: 1 })
    const opList = await page.getOperatorList()
    const { fnArray, argsArray } = opList
    const OPS = pdfjs.OPS

    /** @type {{ minX: number, minY: number, maxX: number, maxY: number, w: number, h: number, cx: number, cy: number }[]} */
    const boxes = []

    for (let i = 0; i < fnArray.length; i++) {
      if (fnArray[i] !== OPS.constructPath) continue
      const args = argsArray[i]
      const pathOp = args[0]
      if (pathOp !== 20) continue
      const segments = args[1]
      if (!Array.isArray(segments)) continue
      for (const seg of segments) {
        const sq = parseCheckboxSegment(seg)
        if (sq) boxes.push(sq)
      }
    }

    // Deduplicate double-stroke
    const deduped = []
    for (const b of boxes) {
      if (!deduped.some((d) => Math.abs(d.cx - b.cx) < 1 && Math.abs(d.cy - b.cy) < 1)) deduped.push(b)
    }

    // PDF y is bottom-origin; convert to top-origin for reporting
    const withTopY = deduped.map((b) => ({
      ...b,
      topY: viewport.height - b.maxY,
      bottomY: viewport.height - b.minY,
    }))
    withTopY.sort((a, b) => b.topY - a.topY || a.minX - b.minX)

    perPage.push({
      page: p,
      pageHeight: viewport.height,
      pageWidth: viewport.width,
      boxes: withTopY,
    })
    page.cleanup()
  }

  await pdf.destroy()
  return perPage
}

async function textGlyphsPerPage(buf) {
  const parser = new PDFParse({ data: buf })
  try {
    const result = await parser.getText()
    return (result.pages ?? []).map((pg) => {
      const text = pg.text || ''
      const matches = text.match(BOX_TEXT_RE) ?? []
      return { page: pg.num, glyphCount: matches.length, glyphs: matches }
    })
  } finally {
    await parser.destroy()
  }
}

async function main() {
  const buf = fs.readFileSync(pdfPath)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = Uint8Array.from(buf)

  console.log('PDF:', pdfPath)

  const textGlyphs = await textGlyphsPerPage(buf)
  const textTotal = textGlyphs.reduce((s, p) => s + p.glyphCount, 0)

  const pages = await countCheckboxSquaresPerPage(pdfjs, data)
  const total = pages.reduce((s, p) => s + p.boxes.length, 0)

  console.log('\n=== Text-layer box glyphs ===')
  console.log('total:', textTotal)

  console.log('\n=== Vector FORMCHECKBOX squares (~10.5pt, constructPath op 20) ===')
  console.log('total:', total, '(expected 25)')
  console.log('\nPer-page breakdown:')
  for (const p of pages) {
    console.log(`  page ${p.page}: ${p.boxes.length}`)
    for (const b of p.boxes) {
      console.log(
        `    x=${b.minX.toFixed(1)}–${b.maxX.toFixed(1)} topY=${b.topY.toFixed(1)} (${b.w.toFixed(1)}×${b.h.toFixed(1)}pt)`,
      )
    }
  }

  const p3 = pages.find((p) => p.page === 3)
  const p4 = pages.find((p) => p.page === 4)
  console.log('\n=== Page 3↔4 boundary analysis (9.2 table split) ===')
  if (p3) {
    const bottom = p3.boxes.filter((b) => b.topY > p3.pageHeight - 80)
    console.log(`Page 3 boxes in bottom 80pt (${bottom.length}):`)
    for (const b of bottom) console.log(`  topY=${b.topY.toFixed(1)} x=${b.minX.toFixed(1)}`)
  }
  if (p4) {
    const top = p4.boxes.filter((b) => b.topY < 80)
    console.log(`Page 4 boxes in top 80pt (${top.length}):`)
    for (const b of top) console.log(`  topY=${b.topY.toFixed(1)} x=${b.minX.toFixed(1)}`)
  }

  // Renter 1 row on page 3 should have boxes near x~45.85; page 4 renters at same x
  const p3renter1 = p3?.boxes.filter((b) => b.minX < 60 && b.topY > 100 && b.topY < 200)
  const p4topStray = p4?.boxes.filter((b) => b.minX < 60 && b.topY < 50)
  console.log('\nPage 3 mid boxes (x<60, topY 100–200):', p3renter1?.length ?? 0)
  console.log('Page 4 stray candidates (x<60, topY<50):', p4topStray?.length ?? 0)
  if (p4topStray?.length) {
    console.log('STRAY DETAIL:', JSON.stringify(p4topStray, null, 2))
  }

  console.log('\n=== Verdict ===')
  if (total === 25) {
    console.log('Total is exactly 25 — prescribed count matches.')
    if (p4topStray?.length) {
      console.log(
        'WARNING: page 4 top has checkbox square(s) but total still 25 — may be table border fragment, not extra FORMCHECKBOX.',
      )
    }
  } else if (total === 26) {
    console.log('Total is 26 — likely stray box from 9.2 table page break. Fix required before commit.')
  } else {
    console.log(`Total is ${total} — investigate (expected 25).`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
