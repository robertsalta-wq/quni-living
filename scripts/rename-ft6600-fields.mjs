/**
 * Build docs/nsw/ft6600-renamed.pdf: official FT6600 with unique semantic AcroForm /T names only.
 *
 * Run: node scripts/rename-ft6600-fields.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { FT6600_ACRO_TO_SEMANTIC, FT6600_SPLIT_YES_NO_FIELDS } from './lib/ft6600-rename-map.mjs'
import {
  applyFt6600FieldRenames,
  assertPageContentsIdentical,
  listFieldNames,
  snapshotPageContents,
} from './lib/ft6600-pdf-rename-utils.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const officialPath = path.join(root, 'docs', 'nsw', 'residential-tenancy-agreement-form-2025-12.pdf')
const outPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed.pdf')
const provenancePath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-provenance.json')
const fieldListPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-field-list.json')
const renderReportPath = path.join(root, 'scripts', 'test-official-form-spike', 'ft6600-renamed-render-diff.json')

const officialBytes = fs.readFileSync(officialPath)
const officialSha = crypto.createHash('sha256').update(officialBytes).digest('hex')

const doc = await PDFDocument.load(officialBytes, { ignoreEncryption: true })
const contentsBefore = snapshotPageContents(doc)

applyFt6600FieldRenames(doc, { ...FT6600_ACRO_TO_SEMANTIC }, FT6600_SPLIT_YES_NO_FIELDS)

const contentsAfter = snapshotPageContents(doc)
assertPageContentsIdentical(contentsBefore, contentsAfter)

const renamedBytes = await doc.save({ useObjectStreams: false })
fs.writeFileSync(outPath, renamedBytes)

const renamedSha = crypto.createHash('sha256').update(renamedBytes).digest('hex')

const reloaded = await PDFDocument.load(renamedBytes, { ignoreEncryption: true })
const names = listFieldNames(reloaded)
const unique = new Set(names)
if (unique.size !== names.length) {
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  throw new Error(`duplicate field names after rename: ${[...new Set(dup)].join(', ')}`)
}

const expectedSemantic = new Set([
  ...Object.values(FT6600_ACRO_TO_SEMANTIC),
  ...FT6600_SPLIT_YES_NO_FIELDS.flatMap((s) => [s.yes, s.no]),
])
const legacyParents = names.filter((n) => /^Text field \d+$/.test(n) || /^Check Box \d+$/.test(n))
if (legacyParents.length > 0) {
  throw new Error(`non-semantic parent folders left in AcroForm: ${legacyParents.join(', ')}`)
}
const missing = [...expectedSemantic].filter((n) => !names.includes(n))
const extra = names.filter((n) => !expectedSemantic.has(n))
if (missing.length > 0) {
  throw new Error(`missing renamed fields: ${missing.join(', ')}`)
}
if (extra.length > 0) {
  console.warn('[rename-ft6600-fields] extra field names not in map:', extra.join(', '))
}

const fieldRows = names.map((name) => ({ name }))
fs.writeFileSync(fieldListPath, JSON.stringify({ count: names.length, fields: fieldRows }, null, 2))

let renderDiff = { attempted: false, ok: false, reason: null, maxDiffPixels: null }
try {
  const { renderDiffFt6600Pair } = await import('./lib/ft6600-render-diff.mjs')
  renderDiff = await renderDiffFt6600Pair(officialBytes, renamedBytes)
  if (!renderDiff.ok) {
    throw new Error(`render diff failed: ${renderDiff.reason ?? 'pixels differ'}`)
  }
} catch (e) {
  if (e instanceof Error && e.message.startsWith('render diff failed')) throw e
  renderDiff = { attempted: false, ok: false, reason: e instanceof Error ? e.message : String(e), maxDiffPixels: null }
  console.warn('[rename-ft6600-fields] render diff skipped:', renderDiff.reason)
}

fs.writeFileSync(renderReportPath, JSON.stringify(renderDiff, null, 2))

fs.writeFileSync(
  provenancePath,
  JSON.stringify(
    {
      sourcePdf: 'docs/nsw/residential-tenancy-agreement-form-2025-12.pdf',
      sourceSha256: officialSha,
      renamedPdf: 'docs/nsw/ft6600-renamed.pdf',
      renamedSha256: renamedSha,
      pageCount: doc.getPageCount(),
      fieldCount: names.length,
      pageContentsByteIdentical: true,
      renderDiff,
      renameScript: 'scripts/rename-ft6600-fields.mjs',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('wrote', outPath)
console.log('fields', names.length, 'unique', unique.size)
console.log('page contents: identical')
console.log('render diff', renderDiff.ok ? 'ok' : renderDiff.reason ?? 'skipped')
console.log('sha256', renamedSha)
