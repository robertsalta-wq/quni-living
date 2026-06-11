/**
 * Remove LO stray checkbox-sized border artifact(s) by deleting path operators
 * from page content streams (not masking).
 */
import zlib from 'node:zlib'
import { PDFDocument, PDFName, PDFArray } from 'pdf-lib'

/**
 * @param {string} block
 */
function isStrayTopLeftCheckboxBorderBlock(block) {
  const reMatch = block.match(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/)
  if (reMatch) {
    const x = parseFloat(reMatch[1])
    const y = parseFloat(reMatch[2])
    const w = Math.abs(parseFloat(reMatch[3]))
    const h = Math.abs(parseFloat(reMatch[4]))
    const maxY = y + h
    return x < 15 && maxY > 790 && w > 8 && w < 14 && h > 8 && h < 14
  }

  const nums = [...block.matchAll(/([\d.-]+) ([\d.]+) (?:m|l)/g)].map((m) => ({
    x: parseFloat(m[1]),
    y: parseFloat(m[2]),
  }))
  if (nums.length < 4) return false

  const xs = nums.map((n) => n.x)
  const ys = nums.map((n) => n.y)
  const minX = Math.min(...xs)
  const maxY = Math.max(...ys)
  const w = Math.max(...xs) - minX
  const h = maxY - Math.min(...ys)

  return minX < 15 && maxY > 790 && w > 8 && w < 14 && h > 8 && h < 14
}

/**
 * @param {string} streamText
 */
export function removeStrayTopLeftCheckboxBorderPathsFromStream(streamText) {
  const blockRe = /q [\d.]+ w[\s\S]*?S\r?\nQ\r?\n/g
  let removed = 0
  const next = streamText.replace(blockRe, (block) => {
    if (!isStrayTopLeftCheckboxBorderBlock(block)) return block
    removed++
    return ''
  })
  return { streamText: next, removed }
}

/**
 * @param {string} streamText
 * @param {string[]} needles
 */
function removeEnclosingPaintBlocks(streamText, needles) {
  let removed = 0
  let text = streamText

  for (const needle of needles) {
    let idx = 0
    while ((idx = text.indexOf(needle, idx)) >= 0) {
      const qStart = text.lastIndexOf('q ', idx)
      let qEnd = text.indexOf('\nQ', idx)
      if (qEnd < 0) qEnd = text.indexOf('Q\n', idx)
      if (qStart < 0 || qEnd < 0 || qEnd <= qStart) {
        idx += needle.length
        continue
      }
      qEnd = text[qEnd] === '\n' ? qEnd + 2 : qEnd + 1
      text = text.slice(0, qStart) + text.slice(qEnd)
      removed++
    }
  }

  return { streamText: text, removed }
}

/**
 * @param {{ minX: number, maxY: number, maxX?: number, minY?: number }} stray
 */
function needlesForStrayBox(stray) {
  const needles = new Set()
  const coords = [
    [stray.minX, stray.maxY],
    [stray.maxX ?? stray.minX + 11, stray.minY ?? stray.maxY - 11],
    [stray.minX, stray.minY ?? stray.maxY - 11],
  ]
  for (const [x, y] of coords) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    needles.add(`${x.toFixed(3)} ${y.toFixed(3)}`)
    needles.add(`${x.toFixed(1)} ${y.toFixed(1)}`)
    if (x < 0) needles.add(`${x.toFixed(1)}`)
  }
  return [...needles].filter((n) => n.length > 3)
}

/**
 * @param {import('pdf-lib').PDFDocument} doc
 * @param {number} pageIndex 0-based
 * @param {{ minX: number, maxY: number, maxX?: number, minY?: number }[]} strayHints
 */
function removeStrayPathsFromPage(doc, pageIndex, strayHints = []) {
  const page = doc.getPage(pageIndex)
  const contentsRef = page.node.get(PDFName.of('Contents'))
  const contents = doc.context.lookup(contentsRef)
  /** @type {import('pdf-lib').PDFRawStream[]} */
  const streams = []

  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      streams.push(doc.context.lookup(contents.get(i)))
    }
  } else if (contents) {
    streams.push(contents)
  } else {
    throw new Error(`stray box content-stream fix: page ${pageIndex + 1} has no Contents`)
  }

  let removed = 0
  for (const stream of streams) {
    const filter = stream.dict.get(PDFName.of('Filter'))
    let decoded = stream.contents
    if (filter && String(filter) === '/FlateDecode') {
      decoded = zlib.inflateSync(Buffer.from(decoded))
    }

    let text = decoded.toString('latin1')
    let n = 0

    const needles = strayHints.flatMap((s) => needlesForStrayBox(s))
    if (needles.length > 0) {
      const hinted = removeEnclosingPaintBlocks(text, needles)
      text = hinted.streamText
      n += hinted.removed
    }

    const generic = removeStrayTopLeftCheckboxBorderPathsFromStream(text)
    text = generic.streamText
    n += generic.removed

    if (n === 0) continue

    removed += n
    const encoded =
      filter && String(filter) === '/FlateDecode'
        ? zlib.deflateSync(Buffer.from(text, 'latin1'))
        : Buffer.from(text, 'latin1')
    stream.contents = encoded
    stream.dict.set(PDFName.of('Length'), doc.context.obj(encoded.length))
  }

  return removed
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @param {{ page: number, minX: number, maxY: number, maxX?: number, minY?: number }[]} [strayHints]
 * @returns {Promise<{ bytes: Uint8Array, removed: number, pagesTouched: number[] }>}
 */
export async function removeVicForm1StrayPage4BoxFromContentStream(bytes, strayHints = []) {
  const pdfBytes = Buffer.isBuffer(bytes) ? Uint8Array.from(bytes) : bytes
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

  const hintsByPage = new Map()
  for (const hint of strayHints) {
    const list = hintsByPage.get(hint.page) ?? []
    list.push(hint)
    hintsByPage.set(hint.page, list)
  }

  let totalRemoved = 0
  /** @type {number[]} */
  const pagesTouched = []

  for (let pageIndex = 0; pageIndex < doc.getPageCount(); pageIndex++) {
    const pageNum = pageIndex + 1
    const n = removeStrayPathsFromPage(doc, pageIndex, hintsByPage.get(pageNum) ?? [])
    if (n > 0) {
      totalRemoved += n
      pagesTouched.push(pageNum)
    }
  }

  if (totalRemoved === 0) {
    throw new Error('stray box content-stream fix: no matching path operators found in PDF')
  }

  return {
    bytes: await doc.save({ useObjectStreams: false }),
    removed: totalRemoved,
    pagesTouched,
  }
}
