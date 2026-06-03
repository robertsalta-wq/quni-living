/**
 * Inspect AcroForm /V and annotation count on an FT6600 PDF.
 * Usage: npx tsx scripts/inspect-ft6600-filled-pdf.mjs [path]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, PDFName } from 'pdf-lib'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pdfPath = process.argv[2] ?? path.join(root, 'scripts/test-official-form-spike/quinn-robert-ft6600-filled.pdf')

const buf = fs.readFileSync(pdfPath)
const doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false })

let fieldCount = 0
let widgetCount = 0
try {
  const fields = doc.getForm().getFields()
  fieldCount = fields.length
  for (const f of fields) widgetCount += f.acroField.getWidgets().length
} catch {
  fieldCount = -1
}

let annotCount = 0
for (const page of doc.getPages()) {
  const annots = page.node.Annots?.()
  if (annots) annotCount += annots.size()
}

console.log('file', pdfPath)
console.log('bytes', buf.length)
console.log('acroForm fields', fieldCount, 'widgets', widgetCount, 'page annots', annotCount)

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise
const acro = await pdf.getFieldObjects()
if (acro) {
  const names = Object.keys(acro)
  console.log('pdfjs field objects', names.length)
  for (const n of [
    'term_6_months_cb',
    'rent_paid_week_cb',
    'rent_paid_bank_cb',
    'bond_paid_to_rbo_cb',
    'water_usage_no_cb',
    'landlord_name_1',
    'rent_amount',
  ]) {
    const o = acro[n]
    if (!o) {
      console.log(n, 'MISSING from acro')
      continue
    }
    const entry = Array.isArray(o) ? o[0] : o
    console.log(n, 'value=', entry?.value, 'checked=', entry?.checked)
  }
} else {
  console.log('pdfjs: no field objects (flattened)')
}

let text = ''
for (let p = 1; p <= Math.min(3, pdf.numPages); p++) {
  const page = await pdf.getPage(p)
  const c = await page.getTextContent()
  text += c.items.map((i) => ('str' in i ? i.str : '')).join(' ')
}
console.log('page1-3 contains Quinn Lee?', text.includes('Quinn Lee'))
console.log('page1-3 contains 400.00?', text.includes('400.00'))
