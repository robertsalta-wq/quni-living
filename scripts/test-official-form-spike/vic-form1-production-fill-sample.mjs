/**
 * Production VIC Form 1 fill sample — renders pages 1, 2, 3, 4, 8 for visual review.
 *
 *   npx tsx scripts/test-official-form-spike/vic-form1-production-fill-sample.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'scripts', 'test-official-form-spike')
const DPI = 144
const SAMPLE_PAGES = [1, 2, 3, 4, 8]

const { fillOfficialVicForm1Pdf } = await import('../../api/lib/documents/officialVicForm1Fill.ts')
const { vicForm1RepresentativeFixtureProps } = await import(
  '../../api/lib/documents/vicForm1RepresentativeFixture.ts'
)

function pdftoppmAvailable() {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function rasterizePages(pdfPath, tmpPrefix, pages) {
  fs.mkdirSync(path.dirname(tmpPrefix), { recursive: true })
  if (!pdftoppmAvailable()) {
    throw new Error('pdftoppm not on PATH (install poppler)')
  }
  const first = Math.min(...pages)
  const last = Math.max(...pages)
  execFileSync(
    'pdftoppm',
    ['-png', '-r', String(DPI), '-f', String(first), '-l', String(last), pdfPath, tmpPrefix],
    { stdio: 'inherit' },
  )
}

function resolvePdftoppmOutput(tmpPrefix, page) {
  const dir = path.dirname(tmpPrefix)
  const base = path.basename(tmpPrefix)
  const candidates = [
    path.join(dir, `${base}-${page}.png`),
    path.join(dir, `${base}-${String(page).padStart(2, '0')}.png`),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  throw new Error(`Missing raster for page ${page} (prefix ${tmpPrefix})`)
}

const props = vicForm1RepresentativeFixtureProps()
const { pdfBytes, filledFieldIds, gaps } = await fillOfficialVicForm1Pdf(props)

const tmpPdf = path.join(root, 'tmp', 'vic-form1-fill-sample', 'filled.pdf')
fs.mkdirSync(path.dirname(tmpPdf), { recursive: true })
fs.writeFileSync(tmpPdf, pdfBytes)

const tmpPrefix = path.join(outDir, 'vic-form1-filled-sample-raster')
rasterizePages(tmpPdf, tmpPrefix, SAMPLE_PAGES)

const pngPaths = []
for (const page of SAMPLE_PAGES) {
  const produced = resolvePdftoppmOutput(tmpPrefix, page)
  const finalPath = path.join(outDir, `vic-form1-filled-sample-page-${page}.png`)
  if (path.resolve(produced) !== path.resolve(finalPath)) {
    fs.copyFileSync(produced, finalPath)
  }
  pngPaths.push(finalPath)
}

for (const f of fs.readdirSync(outDir)) {
  if (f.startsWith('vic-form1-filled-sample-raster-') && f.endsWith('.png')) {
    try {
      fs.unlinkSync(path.join(outDir, f))
    } catch {
      /* ignore */
    }
  }
}
for (const f of fs.readdirSync(outDir)) {
  if (/^vic-form1-filled-sample-page-\d+-\d+\.png$/.test(f)) {
    try {
      fs.unlinkSync(path.join(outDir, f))
    } catch {
      /* ignore */
    }
  }
}

console.log(`[vic-form1-fill-sample] filled ${filledFieldIds.length} field(s)`)
console.log('[vic-form1-fill-sample] gaps:')
for (const g of gaps) {
  console.log(`  - ${g}`)
}
console.log('[vic-form1-fill-sample] PNG paths:')
for (const p of pngPaths) {
  console.log(`  ${path.relative(root, p).split(path.sep).join('/')}`)
}
