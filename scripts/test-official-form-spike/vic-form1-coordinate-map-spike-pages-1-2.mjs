/**
 * Throwaway coordinate-map validation for VIC Form 1 pages 1–2.
 * Draws field ids into mapped rects on the canonical blank; rasterizes for visual check.
 *
 *   node scripts/test-official-form-spike/vic-form1-coordinate-map-spike-pages-1-2.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')

const MAP_PATH = path.join(root, 'docs', 'vic', 'vic-form1-coordinate-map.json')
const BLANK_PDF = path.join(root, 'docs', 'vic', 'form-1-blank.pdf')
const OUT_DIR = path.join(root, 'scripts', 'test-official-form-spike')
const DPI = 144
const FONT_SIZE = 9
const HORIZONTAL_PAD = 2
const BASELINE_OFFSET = 3

const LO_DOCKER_IMAGE =
  'lankalana/libreoffice-headless@sha256:73910b51dabfbc32234f0d14d7f64751e8c5414e380d191647a41e7f81975c7b'

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

/** @param {[number, number, number, number]} rectPdf */
function rectFromPdf(rectPdf) {
  const [x0, y0, x1, y1] = rectPdf
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

/**
 * @param {string} text
 * @param {import('pdf-lib').PDFFont} font
 * @param {{ x: number, y: number, width: number, height: number }} rect
 */
function clipTextToWidth(text, font, rect) {
  const maxWidth = Math.max(8, rect.width - HORIZONTAL_PAD * 2)
  let line = text
  if (font.widthOfTextAtSize(line, FONT_SIZE) <= maxWidth) return line
  const ellipsis = '…'
  while (line.length > 1 && font.widthOfTextAtSize(line + ellipsis, FONT_SIZE) > maxWidth) {
    line = line.slice(0, -1)
  }
  return line.length < text.length ? line + ellipsis : line
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {import('pdf-lib').PDFFont} font
 * @param {{ id: string, type: string, rect_pdf: [number, number, number, number] }} field
 */
function drawFieldLabel(page, font, field) {
  const rect = rectFromPdf(field.rect_pdf)

  if (field.type === 'checkbox') {
    const size = Math.min(rect.width, rect.height) * 0.75
    const glyph = 'X'
    const textWidth = font.widthOfTextAtSize(glyph, size)
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    page.drawText(glyph, {
      x: cx - textWidth / 2,
      y: cy - size * 0.35,
      size,
      font,
      color: rgb(0.85, 0.1, 0.1),
    })
    return
  }

  if (field.type === 'text' || field.type === 'date' || field.type === 'multiline') {
    const line = clipTextToWidth(field.id, font, rect)
    page.drawText(line, {
      x: rect.x + HORIZONTAL_PAD,
      y: rect.y + BASELINE_OFFSET,
      size: FONT_SIZE,
      font,
      color: rgb(0.1, 0.1, 0.75),
    })
  }
}

function pdftoppmAvailable() {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function runDocker(imageRef, args) {
  const r = spawnSync('docker', ['run', '--rm', '-v', `${root}:/work`, '-w', '/work', imageRef, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    throw new Error(`docker run failed (${r.status}): ${r.stderr || r.stdout}`)
  }
  return { stdout: r.stdout, stderr: r.stderr }
}

/**
 * @param {string} pdfPath absolute
 * @param {string} outPrefix absolute path prefix (no extension)
 * @returns {string[]} PNG paths in page order
 */
function rasterizePages(pdfPath, outPrefix) {
  const outDir = path.dirname(outPrefix)
  const base = path.basename(outPrefix)
  fs.mkdirSync(outDir, { recursive: true })

  const relPdf = path.relative(root, pdfPath).split(path.sep).join('/')
  const relOutDir = path.relative(root, outDir).split(path.sep).join('/')
  const relPrefix = `${relOutDir}/${base}`

  if (pdftoppmAvailable()) {
    execFileSync(
      'pdftoppm',
      ['-png', '-r', String(DPI), '-f', '1', '-l', '2', pdfPath, outPrefix],
      { stdio: 'inherit' },
    )
  } else {
    console.log('[coord-spike] pdftoppm not on PATH; using Docker poppler')
    runDocker(LO_DOCKER_IMAGE, [
      'bash',
      '-lc',
      `pdftoppm -png -r ${DPI} -f 1 -l 2 /work/${relPdf} /work/${relPrefix}`,
    ])
  }

  const candidates = fs
    .readdirSync(outDir)
    .filter((f) => f.startsWith(`${base}-`) && f.endsWith('.png'))
    .sort((a, b) => {
      const na = Number.parseInt(a.match(/-(\d+)\.png$/)?.[1] ?? '0', 10)
      const nb = Number.parseInt(b.match(/-(\d+)\.png$/)?.[1] ?? '0', 10)
      return na - nb
    })
    .map((f) => path.join(outDir, f))

  if (candidates.length < 2) {
    throw new Error(`Expected 2 PNGs with prefix ${base}-*.png in ${outDir}`)
  }
  return candidates.slice(0, 2)
}

async function main() {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'))
  const blankBytes = fs.readFileSync(BLANK_PDF)
  const blankSha = sha256(blankBytes)

  if (blankSha !== map.sourcePdfSha256) {
    console.error('[coord-spike] SHA256 mismatch')
    console.error('  blank:', blankSha)
    console.error('  map:  ', map.sourcePdfSha256)
    process.exit(1)
  }

  const pageFields = map.fields.filter((f) => f.page === 1 || f.page === 2)
  console.log(`[coord-spike] ${pageFields.length} fields on pages 1–2`)

  const doc = await PDFDocument.load(blankBytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  for (const field of pageFields) {
    const page = pages[field.page - 1]
    if (!page) throw new Error(`Missing page ${field.page} for ${field.id}`)
    drawFieldLabel(page, font, field)
  }

  const filledBytes = await doc.save()
  const tmpPdf = path.join(root, 'tmp', 'vic-form1-coord-spike', 'filled-pages-1-2.pdf')
  fs.mkdirSync(path.dirname(tmpPdf), { recursive: true })
  fs.writeFileSync(tmpPdf, filledBytes)

  const prefix = path.join(OUT_DIR, 'vic-form1-coordinate-spike-page')
  const produced = rasterizePages(tmpPdf, prefix)

  const finalPaths = []
  for (let i = 0; i < produced.length; i++) {
    const pageNum = i + 1
    const finalName = `vic-form1-coordinate-spike-page-${pageNum}.png`
    const finalPath = path.join(OUT_DIR, finalName)
    if (path.resolve(produced[i]) !== path.resolve(finalPath)) {
      fs.copyFileSync(produced[i], finalPath)
      if (produced[i] !== finalPath) {
        try {
          fs.unlinkSync(produced[i])
        } catch {
          /* ignore */
        }
      }
    }
    finalPaths.push(finalPath)
  }

  console.log('[coord-spike] PNG paths:')
  for (const p of finalPaths) {
    console.log(' ', path.relative(root, p).split(path.sep).join('/'))
  }
}

main().catch((err) => {
  console.error('[coord-spike] failed:', err)
  process.exit(1)
})
