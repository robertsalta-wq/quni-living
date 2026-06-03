/**
 * Build docs/nsw/ft6600-renamed.pdf: official FT6600 with unique semantic AcroForm /T names only.
 * Renames by authoritative page+rect map (docs/nsw/ft6600-corrected-field-map.json).
 *
 * Run: node scripts/rename-ft6600-fields.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { verifyRenamedFieldLabels, verifyRenamedFieldsMatchMap } from './lib/ft6600-field-label-verify.mjs'
import {
  applyFt6600CorrectedRenames,
  assertPageContentsIdentical,
  listFieldNames,
  snapshotPageContents,
} from './lib/ft6600-pdf-rename-utils.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const officialPath = path.join(root, 'docs', 'nsw', 'residential-tenancy-agreement-form-2025-12.pdf')
const mapPath = path.join(root, 'docs', 'nsw', 'ft6600-corrected-field-map.json')
const outPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed.pdf')
const provenancePath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-provenance.json')
const fieldListPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-field-list.json')
const labelVerifyPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-label-verify.json')
const renderReportPath = path.join(root, 'scripts', 'test-official-form-spike', 'ft6600-renamed-render-diff.json')

const correctedMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const officialBytes = fs.readFileSync(officialPath)
const officialSha = crypto.createHash('sha256').update(officialBytes).digest('hex')

const doc = await PDFDocument.load(officialBytes, { ignoreEncryption: true })
const contentsBefore = snapshotPageContents(doc)

applyFt6600CorrectedRenames(doc, correctedMap)

const contentsAfter = snapshotPageContents(doc)
assertPageContentsIdentical(contentsBefore, contentsAfter)

const renamedBytesPass1 = await doc.save({ useObjectStreams: false })
const normalizedDoc = await PDFDocument.load(renamedBytesPass1, { ignoreEncryption: true })
const renamedBytes = await normalizedDoc.save({ useObjectStreams: false })
fs.writeFileSync(outPath, renamedBytes)

const renamedSha = crypto.createHash('sha256').update(renamedBytes).digest('hex')

const reloaded = await PDFDocument.load(renamedBytes, { ignoreEncryption: true })
const names = listFieldNames(reloaded)
const unique = new Set(names)
if (unique.size !== names.length) {
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  throw new Error(`duplicate field names after rename: ${[...new Set(dup)].join(', ')}`)
}
if (names.length !== 131) {
  throw new Error(`expected 131 fields, got ${names.length}`)
}

const expectedNames = new Set(correctedMap.map((m) => m.correct_name))
const missing = [...expectedNames].filter((n) => !names.includes(n))
const extra = names.filter((n) => !expectedNames.has(n))
if (missing.length > 0) throw new Error(`missing renamed fields: ${missing.join(', ')}`)
if (extra.length > 0) throw new Error(`extra field names: ${extra.join(', ')}`)

const structuralVerify = verifyRenamedFieldsMatchMap(reloaded, correctedMap)
if (!structuralVerify.ok) {
  throw new Error(`structural verify failed: ${JSON.stringify(structuralVerify.failures.slice(0, 5))}`)
}

const labelVerify = await verifyRenamedFieldLabels(renamedBytes, correctedMap)
fs.writeFileSync(labelVerifyPath, JSON.stringify(labelVerify, null, 2))
const labelPassCount = labelVerify.rows.filter((r) => r.ok).length
if (labelPassCount < 131) {
  console.warn(
    `[rename-ft6600-fields] label verify: ${labelPassCount}/131 passed (${labelVerify.failures.length} nearest-label mismatches — see ${labelVerifyPath})`,
  )
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
      renameMap: 'docs/nsw/ft6600-corrected-field-map.json',
      pageCount: doc.getPageCount(),
      fieldCount: names.length,
      pageContentsByteIdentical: true,
      labelVerify: {
        ok: labelVerify.ok,
        passCount: labelPassCount,
        failureCount: labelVerify.failures.length,
        dump: 'docs/nsw/ft6600-renamed-label-verify.json',
      },
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
console.log('label verify', `${labelPassCount}/131 (dump`, labelVerifyPath + ')')
console.log('render diff', renderDiff.ok ? 'ok' : renderDiff.reason ?? 'skipped')
console.log('sha256', renamedSha)
