/**
 * Count LO-exported FORMCHECKBOX squares in VIC Form 1 blank PDF.
 * Checkboxes are ~10.5pt closed paths (pdfjs constructPath op 20, 13 coords).
 */

/** @param {Float32Array | number[]} seg */
function parseCheckboxSegment(seg) {
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
export async function scanVicForm1CheckboxSquares(pdfjs, data) {
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  /** @type {{ page: number, pageHeight: number, pageWidth: number, boxes: object[] }[]} */
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

    const deduped = []
    for (const b of boxes) {
      if (!deduped.some((d) => Math.abs(d.cx - b.cx) < 1 && Math.abs(d.cy - b.cy) < 1)) deduped.push(b)
    }

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

  const total = perPage.reduce((s, p) => s + p.boxes.length, 0)
  const page4 = perPage.find((p) => p.page === 4)
  const strayCandidates =
    page4?.boxes.filter((b) => b.minX < 60 && b.topY < 50) ?? []

  return {
    total,
    expected: 25,
    ok: total === 25,
    perPage: perPage.map((p) => ({ page: p.page, count: p.boxes.length, boxes: p.boxes })),
    strayPage4TopLeft: strayCandidates,
  }
}

/**
 * @param {Uint8Array | Buffer} bytes
 */
export async function scanVicForm1CheckboxSquaresFromBytes(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = Buffer.isBuffer(bytes) ? Uint8Array.from(bytes) : bytes
  return scanVicForm1CheckboxSquares(pdfjs, data)
}
