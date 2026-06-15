/**
 * VIC Form 1 fill + DocuSeal signing tag sample (representative fixture, 3 signers).
 *
 *   npx tsx scripts/test-official-form-spike/vic-form1-signing-sample.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'scripts', 'test-official-form-spike')
const DPI = 144
const PAGE_8 = 8

const { buildOfficialVicForm1PdfWithSigning } = await import(
  '../../api/lib/documents/officialVicForm1Signing.ts'
)
const {
  assertVicForm1DocusealTagsExact,
  extractVicForm1DocusealTagsFromPdfPage,
  resolveVicForm1IncludeCoTenantSignature,
} = await import('../../api/lib/documents/officialVicForm1Signing.ts')
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

function rasterizePage8(pdfPath, tmpPrefix) {
  if (!pdftoppmAvailable()) throw new Error('pdftoppm not on PATH')
  execFileSync(
    'pdftoppm',
    ['-png', '-r', String(DPI), '-f', String(PAGE_8), '-l', String(PAGE_8), pdfPath, tmpPrefix],
    { stdio: 'inherit' },
  )
}

function resolvePdftoppmOutput(tmpPrefix, page) {
  const dir = path.dirname(tmpPrefix)
  const base = path.basename(tmpPrefix)
  for (const name of [`${base}-${page}.png`, `${base}-${String(page).padStart(2, '0')}.png`]) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) return p
  }
  throw new Error(`Missing raster for page ${page}`)
}

const props = vicForm1RepresentativeFixtureProps()
const includeCoTenantSignatureTags = resolveVicForm1IncludeCoTenantSignature(props)

const result = await buildOfficialVicForm1PdfWithSigning(props, { includeCoTenantSignatureTags })

const tmpPdf = path.join(root, 'tmp', 'vic-form1-signing-sample', 'filled-tagged.pdf')
fs.mkdirSync(path.dirname(tmpPdf), { recursive: true })
fs.writeFileSync(tmpPdf, result.pdfBytes)

const detected = await extractVicForm1DocusealTagsFromPdfPage(result.pdfBytes, PAGE_8)
assertVicForm1DocusealTagsExact(detected, includeCoTenantSignatureTags)

if (!result.hasDocusealTags) {
  throw new Error('PDF bytes missing DocuSeal tag markers')
}

const tmpPrefix = path.join(outDir, 'vic-form1-signing-sample-raster')
rasterizePage8(tmpPdf, tmpPrefix)
const produced = resolvePdftoppmOutput(tmpPrefix, PAGE_8)
const finalPng = path.join(outDir, 'vic-form1-signing-sample-page-8.png')
fs.copyFileSync(produced, finalPng)
for (const f of fs.readdirSync(outDir)) {
  if (f.startsWith('vic-form1-signing-sample-raster-') && f.endsWith('.png')) {
    try {
      fs.unlinkSync(path.join(outDir, f))
    } catch {
      /* ignore */
    }
  }
}

console.log(`[vic-form1-signing-sample] includeCoTenantSignatureTags=${includeCoTenantSignatureTags}`)
console.log(`[vic-form1-signing-sample] hasDocusealTags=${result.hasDocusealTags} tagCount=${result.tagCount}`)
console.log('[vic-form1-signing-sample] detected tags (page 8):')
for (const d of detected.sort((a, b) => b.y - a.y)) {
  console.log(
    `  ${d.role} / ${d.type} @ page ${d.pageIndex + 1} (${d.x.toFixed(1)}, ${d.y.toFixed(1)}) field=${d.fieldId}`,
  )
  console.log(`    ${d.tag}`)
}
console.log('[vic-form1-signing-sample] planned placements:')
for (const p of result.widgetTagPlacements) {
  console.log(
    `  ${p.fieldName} @ page ${p.pageIndex + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
  )
}
console.log(
  `[vic-form1-signing-sample] PNG: ${path.relative(root, finalPng).split(path.sep).join('/')}`,
)
