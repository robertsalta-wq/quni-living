/**
 * Raster compare official vs renamed PDF (blank forms). Requires optional `canvas` package.
 */
let canvasModule = null
try {
  canvasModule = await import('canvas')
} catch {
  canvasModule = null
}

/**
 * @param {Uint8Array} officialBytes
 * @param {Uint8Array} renamedBytes
 */
export async function renderDiffFt6600Pair(officialBytes, renamedBytes) {
  if (!canvasModule) {
    return { attempted: false, ok: false, reason: 'canvas package not installed', maxDiffPixels: null }
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { createCanvas, Image } = canvasModule
  if (typeof globalThis.Image === 'undefined') {
    globalThis.Image = Image
  }

  const scale = 2
  let maxDiffPixels = 0
  let pagesCompared = 0

  const renderDoc = async (bytes) => {
    const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true })
    const pdf = await loadingTask.promise
    const images = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport }).promise
      images.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    return images
  }

  /** pdfjs rejects Node Buffer even though it subclasses Uint8Array. */
  const toUint8 = (bytes) => new Uint8Array(bytes)
  const official = toUint8(officialBytes)
  const renamed = toUint8(renamedBytes)
  const [a, b] = await Promise.all([renderDoc(official), renderDoc(renamed)])
  if (a.length !== b.length) {
    return { attempted: true, ok: false, reason: `page count ${a.length} vs ${b.length}`, maxDiffPixels: null }
  }

  for (let p = 0; p < a.length; p++) {
    const ia = a[p]
    const ib = b[p]
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return {
        attempted: true,
        ok: false,
        reason: `page ${p} size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`,
        maxDiffPixels: null,
      }
    }
    for (let i = 0; i < ia.data.length; i += 4) {
      if (ia.data[i] !== ib.data[i] || ia.data[i + 1] !== ib.data[i + 1] || ia.data[i + 2] !== ib.data[i + 2]) {
        maxDiffPixels++
      }
    }
    pagesCompared++
  }

  return {
    attempted: true,
    ok: maxDiffPixels === 0,
    reason: maxDiffPixels === 0 ? null : `${maxDiffPixels} pixels differ across ${pagesCompared} pages`,
    maxDiffPixels,
    pagesCompared,
    scale,
  }
}
