/**
 * Interpreter annex gate for VIC Form 1 blank PDF freeze.
 *
 * Fidelity gate of record: rasterized annex PNG(s) for human review against a known-good render.
 * Automated checks below are supporting heuristics only — correct Arabic/CJK codepoints remain
 * in the PDF text layer even when glyphs render as boxes, and box glyphs carry ink so density
 * checks can miss tofu too.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Representative substrings from docs/vic/form-1-extracted-from-cav.md (interpreter annex). */
export const VIC_FORM1_ANNEX_COMPLEX_SCRIPT_SAMPLES = [
  { id: 'arabic', sample: 'إذا', pattern: /[\u0600-\u06FF]{4,}/ },
  { id: 'chinese', sample: '如果您', pattern: /[\u4E00-\u9FFF]{2,}/ },
  { id: 'amharic', sample: 'በእንግሊዝኛ', pattern: /[\u1200-\u137F]{4,}/ },
  { id: 'greek', sample: 'Αν έχετε', pattern: /[\u0370-\u03FF]{4,}/ },
  { id: 'cyrillic', sample: 'Ако', pattern: /[\u0400-\u04FF]{4,}/ },
  { id: 'dari', sample: 'اگر شما', pattern: /[\u0600-\u06FF]{4,}/ },
]

const ANNEX_START_MARKER = 'Telephone interpreter service'
const ANNEX_END_MARKER = 'Italian'

const TOFU_TEXT_RE = /[\u25A1\uFFFD\uF8FF]/g

const RASTER_SCALE = 2
const MIN_ANNEX_INK_RATIO = 0.008

let canvasModule = null
try {
  canvasModule = await import('canvas')
} catch {
  canvasModule = null
}

/**
 * @param {string} text
 */
export function gateComplexScriptText(text) {
  const results = []
  let ok = true
  for (const { id, sample, pattern } of VIC_FORM1_ANNEX_COMPLEX_SCRIPT_SAMPLES) {
    const hasSample = text.includes(sample)
    const hasScriptRun = pattern.test(text)
    const pass = hasSample && hasScriptRun
    if (!pass) ok = false
    results.push({ id, sample, hasSample, hasScriptRun, pass })
  }
  const tofuMatches = text.match(TOFU_TEXT_RE) ?? []
  const tofuCharCount = tofuMatches.length
  if (tofuCharCount > 0) ok = false
  return { ok, results, tofuCharCount }
}

/**
 * @param {readonly string[]} pageTexts 0-based page index → extracted text
 */
export function findInterpreterAnnexPageIndices(pageTexts) {
  let start = -1
  for (let i = 0; i < pageTexts.length; i++) {
    if (pageTexts[i].includes(ANNEX_START_MARKER)) {
      start = i
      break
    }
  }
  if (start < 0) {
    throw new Error(`interpreter annex: missing start marker "${ANNEX_START_MARKER}"`)
  }
  let end = start
  for (let i = start; i < pageTexts.length; i++) {
    if (new RegExp(`\\b${ANNEX_END_MARKER}\\b`, 'i').test(pageTexts[i])) {
      end = i
      break
    }
  }
  if (end < start) {
    throw new Error(`interpreter annex: missing end marker "${ANNEX_END_MARKER}"`)
  }
  return { start, end, pageIndices: Array.from({ length: end - start + 1 }, (_, k) => start + k) }
}

/**
 * @param {Uint8Array} pdfBytes
 * @returns {Promise<string[]>}
 */
export async function extractPdfPageTexts(pdfBytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  const pageTexts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    pageTexts.push(text)
  }
  return pageTexts
}

/**
 * @param {import('canvas').ImageData} imageData
 */
export function measureInkRatio(imageData) {
  const { data, width, height } = imageData
  let dark = 0
  const total = width * height
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    if (lum < 200) dark++
  }
  return total > 0 ? dark / total : 0
}

/**
 * @param {Uint8Array} pdfBytes
 * @param {number[]} pageIndices 0-based
 * @param {string} outDir
 */
export async function rasterizeAnnexPagesToPng(pdfBytes, pageIndices, outDir) {
  if (!canvasModule) {
    throw new Error('canvas package required for interpreter annex raster gate')
  }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { createCanvas } = canvasModule
  const data = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
  fs.mkdirSync(outDir, { recursive: true })

  const pngPaths = []
  const inkByPage = []

  for (const pageIndex of pageIndices) {
    const pageNum = pageIndex + 1
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: RASTER_SCALE })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const inkRatio = measureInkRatio(imageData)
    inkByPage.push({ pageIndex, pageNum, inkRatio, width: canvas.width, height: canvas.height })

    const fileName = `vic-form1-interpreter-annex-page-${pageNum}.png`
    const outPath = path.join(outDir, fileName)
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'))
    pngPaths.push(outPath)
  }

  return { pngPaths, inkByPage, scale: RASTER_SCALE }
}

/**
 * @param {Uint8Array} pdfBytes
 * @param {{ outDir: string, repoRoot?: string }} opts
 */
export async function runInterpreterAnnexGate(pdfBytes, opts) {
  const pageTexts = await extractPdfPageTexts(pdfBytes)
  const fullText = pageTexts.join('\n')
  const textGate = gateComplexScriptText(fullText)
  const { pageIndices } = findInterpreterAnnexPageIndices(pageTexts)
  const { pngPaths, inkByPage, scale } = await rasterizeAnnexPagesToPng(pdfBytes, pageIndices, opts.outDir)

  const lowInkPages = inkByPage.filter((p) => p.inkRatio < MIN_ANNEX_INK_RATIO)
  const inkOk = lowInkPages.length === 0

  const heuristicOk = textGate.ok && inkOk
  const repoRoot = opts.repoRoot ?? process.cwd()
  const relPaths = pngPaths.map((p) => path.relative(repoRoot, p).split(path.sep).join('/'))

  return {
    heuristicOk,
    /** @deprecated use heuristicOk — automated checks are not the fidelity gate */
    ok: heuristicOk,
    gate: 'interpreterAnnex',
    fidelityGateOfRecord: 'annex PNG human review',
    scale,
    annexPageIndices: pageIndices,
    annexPageNumbers: pageIndices.map((i) => i + 1),
    textGate,
    inkByPage,
    minAnnexInkRatio: MIN_ANNEX_INK_RATIO,
    inkOk,
    lowInkPages,
    pngPaths: relPaths,
    reportNote:
      'PNG visual is gate of record; text samples, tofu chars, and ink density are supporting heuristics only.',
  }
}
