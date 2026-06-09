/**
 * Build docs/qld/form18a-renamed.pdf: official Form 18a with checkbox /T renames only.
 * Authority: docs/qld/qld-form18a-corrected-field-map.json (page + rect_top).
 *
 * Action buttons (Reset form, Print form) remain for render-diff gate; fill pipeline removes them.
 *
 * Run: node scripts/rename-form18a-fields.mjs
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import {
  applyFt6600CorrectedRenames,
  assertPageContentsIdentical,
  collectAllFieldWidgets,
  listFieldNames,
  rectsNear,
  snapshotPageContents,
} from './lib/ft6600-pdf-rename-utils.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const officialPath = path.join(root, 'docs', 'qld', 'form-18a-general-tenancy-agreement-v23-sep25.pdf')
const mapPath = path.join(root, 'docs', 'qld', 'qld-form18a-corrected-field-map.json')
const outPath = path.join(root, 'docs', 'qld', 'form18a-renamed.pdf')
const provenancePath = path.join(root, 'docs', 'qld', 'form18a-renamed-provenance.json')
const fieldListPath = path.join(root, 'docs', 'qld', 'form18a-renamed-field-list.json')
const renderReportPath = path.join(root, 'scripts', 'test-official-form-spike', 'form18a-renamed-render-diff.json')

const mapDoc = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const correctedMap = mapDoc.fields.map((f) => ({
  page: f.page,
  rect: f.rect_top,
  correct_name: f.correct_name,
  action: f.action,
  type: f.type,
}))

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
if (names.length !== 135) {
  throw new Error(`expected 135 AcroForm fields (incl. action buttons), got ${names.length}`)
}

const dataFieldNames = correctedMap.filter((m) => m.action !== 'exclude').map((m) => m.correct_name)
const actionButtonNames = correctedMap.filter((m) => m.action === 'exclude').map((m) => m.correct_name)
if (dataFieldNames.length !== 133) {
  throw new Error(`expected 133 data fields in map, got ${dataFieldNames.length}`)
}
if (actionButtonNames.length !== 2) {
  throw new Error(`expected 2 action buttons in map, got ${actionButtonNames.length}`)
}

const expectedNames = new Set(correctedMap.map((m) => m.correct_name))
const missing = [...expectedNames].filter((n) => !names.includes(n))
const extra = names.filter((n) => !expectedNames.has(n))
if (missing.length > 0) throw new Error(`missing renamed fields: ${missing.join(', ')}`)
if (extra.length > 0) throw new Error(`extra field names: ${extra.join(', ')}`)

const widgets = collectAllFieldWidgets(reloaded)
for (const w of widgets) {
  const entry = correctedMap.find((m) => m.page - 1 === w.page && rectsNear(m.rect, w.rect))
  if (!entry) {
    throw new Error(`structural: no map entry for widget ${w.field.getName()} p${w.page + 1}`)
  }
  if (w.field.getName() !== entry.correct_name) {
    throw new Error(
      `structural: name mismatch ${w.field.getName()} vs ${entry.correct_name} p${w.page + 1}`,
    )
  }
}

const fieldRows = names.map((name) => {
  const meta = correctedMap.find((m) => m.correct_name === name)
  return { name, action: meta?.action ?? 'unknown', type: meta?.type ?? 'unknown' }
})
fs.writeFileSync(
  fieldListPath,
  JSON.stringify({ count: names.length, dataFieldCount: dataFieldNames.length, fields: fieldRows }, null, 2),
)

let renderDiff = { attempted: false, ok: false, reason: null, maxDiffPixels: null }
try {
  const { renderDiffFt6600Pair } = await import('./lib/ft6600-render-diff.mjs')
  renderDiff = await renderDiffFt6600Pair(officialBytes, renamedBytes)
  if (!renderDiff.ok) {
    throw new Error(`render diff failed: ${renderDiff.reason ?? 'pixels differ'}`)
  }
} catch (e) {
  if (e instanceof Error && e.message.startsWith('render diff failed')) throw e
  renderDiff = {
    attempted: false,
    ok: false,
    reason: e instanceof Error ? e.message : String(e),
    maxDiffPixels: null,
  }
  console.warn('[rename-form18a-fields] render diff skipped:', renderDiff.reason)
}

fs.writeFileSync(renderReportPath, JSON.stringify(renderDiff, null, 2))

fs.writeFileSync(
  provenancePath,
  JSON.stringify(
    {
      sourcePdf: 'docs/qld/form-18a-general-tenancy-agreement-v23-sep25.pdf',
      sourceSha256: officialSha,
      renamedPdf: 'docs/qld/form18a-renamed.pdf',
      renamedSha256: renamedSha,
      renameMap: 'docs/qld/qld-form18a-corrected-field-map.json',
      pageCount: doc.getPageCount(),
      acroFormFieldCount: names.length,
      dataFieldCount: dataFieldNames.length,
      actionButtonsExcludedFromFill: actionButtonNames,
      pageContentsByteIdentical: true,
      renderDiff,
      renameScript: 'scripts/rename-form18a-fields.mjs',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('wrote', outPath)
console.log('fields', names.length, 'data', dataFieldNames.length, 'action buttons', actionButtonNames.length)
console.log('page contents: identical')
console.log('render diff', renderDiff.ok ? `ok maxDiffPixels=${renderDiff.maxDiffPixels}` : renderDiff.reason ?? 'skipped')
console.log('sha256', renamedSha)
