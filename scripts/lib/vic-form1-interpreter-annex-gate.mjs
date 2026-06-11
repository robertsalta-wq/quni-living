/**
 * Interpreter annex gate for VIC Form 1 blank PDF freeze.
 *
 * Fidelity gate of record: pdftoppm rasterized annex PNG(s) for human review.
 * Text/ink heuristics are supporting only.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
  measurePngInkRatio,
  pdftoppmPagesDocker,
  VIC_FORM1_RASTER_DPI,
  bytesToBuffer,
} from './vic-form1-pdftoppm-raster.mjs'

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
const MIN_ANNEX_INK_RATIO = 0.008

function toUint8(bytes) {
  // pdfjs-dist rejects Node Buffer even though Buffer extends Uint8Array.
  if (Buffer.isBuffer(bytes)) {
    return Uint8Array.from(bytes)
  }
  if (bytes instanceof Uint8Array) {
    if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
      return bytes
    }
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  return new Uint8Array(bytes)
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
    }
  }
  if (end < start) {
    throw new Error(`interpreter annex: missing end marker "${ANNEX_END_MARKER}"`)
  }
  return { start, end, pageIndices: Array.from({ length: end - start + 1 }, (_, k) => start + k) }
}

/**
 * Text-only page extract (pdfjs getTextContent — no canvas render).
 * @param {Uint8Array | Buffer} pdfBytes
 */
export async function extractPdfPageTexts(pdfBytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const pdf = await pdfjs.getDocument({ data: toUint8(pdfBytes), useSystemFonts: true }).promise
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
 * @param {object} opts
 * @param {Uint8Array | Buffer} opts.pdfBytes
 * @param {number[]} opts.pageIndices 0-based
 * @param {string} opts.outDir
 * @param {string} opts.repoRoot
 * @param {string} opts.imageRef
 * @param {Function} opts.runDocker
 */
export async function rasterizeAnnexPagesToPng(opts) {
  const { pageIndices } = opts
  if (pageIndices.length === 0) {
    throw new Error('interpreter annex: no pages to rasterize')
  }

  const tmpDir = path.join(opts.repoRoot, 'tmp', 'vic-form1-freeze', `annex-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const pdfPath = path.join(tmpDir, 'input.pdf')
  fs.writeFileSync(pdfPath, bytesToBuffer(opts.pdfBytes))

  const firstPage = pageIndices[0] + 1
  const lastPage = pageIndices[pageIndices.length - 1] + 1

  try {
    const produced = pdftoppmPagesDocker({
      imageRef: opts.imageRef,
      runDocker: opts.runDocker,
      hostPdfPath: pdfPath,
      hostOutDir: tmpDir,
      repoRoot: opts.repoRoot,
      firstPage,
      lastPage,
      dpi: VIC_FORM1_RASTER_DPI,
    })

    fs.mkdirSync(opts.outDir, { recursive: true })
    const pngPaths = []
    const inkByPage = []

    for (let i = 0; i < produced.length; i++) {
      const pageIndex = pageIndices[i]
      const pageNum = pageIndex + 1
      const fileName = `vic-form1-interpreter-annex-page-${pageNum}.png`
      const outPath = path.join(opts.outDir, fileName)
      fs.copyFileSync(produced[i], outPath)
      pngPaths.push(outPath)

      const ink = await measurePngInkRatio(fs.readFileSync(outPath))
      inkByPage.push({
        pageIndex,
        pageNum,
        inkRatio: ink.inkRatio,
        width: ink.width,
        height: ink.height,
      })
    }

    return { pngPaths, inkByPage, scale: VIC_FORM1_RASTER_DPI, rasterizer: 'pdftoppm' }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * @param {Uint8Array | Buffer} pdfBytes
 * @param {{ outDir: string, repoRoot: string, imageRef: string, runDocker: Function }} opts
 */
export async function runInterpreterAnnexGate(pdfBytes, opts) {
  const pageTexts = await extractPdfPageTexts(pdfBytes)
  const fullText = pageTexts.join('\n')
  const textGate = gateComplexScriptText(fullText)
  const { pageIndices } = findInterpreterAnnexPageIndices(pageTexts)
  const { pngPaths, inkByPage, scale, rasterizer } = await rasterizeAnnexPagesToPng({
    pdfBytes,
    pageIndices,
    outDir: opts.outDir,
    repoRoot: opts.repoRoot,
    imageRef: opts.imageRef,
    runDocker: opts.runDocker,
  })

  const lowInkPages = inkByPage.filter((p) => p.inkRatio < MIN_ANNEX_INK_RATIO)
  const inkOk = lowInkPages.length === 0
  const heuristicOk = textGate.ok && inkOk
  const repoRoot = opts.repoRoot ?? process.cwd()
  const relPaths = pngPaths.map((p) => path.relative(repoRoot, p).split(path.sep).join('/'))

  return {
    heuristicOk,
    ok: heuristicOk,
    gate: 'interpreterAnnex',
    fidelityGateOfRecord: 'annex PNG human review (pdftoppm)',
    rasterizer,
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
      'pdftoppm PNG is gate of record; text samples, tofu chars, and ink density are supporting heuristics only.',
  }
}
