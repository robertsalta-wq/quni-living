/**
 * Export every text-field widget with PDF page index (via /P) and rectangle.
 * Output: scripts/test-official-form-spike/widget-placements.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const template = path.join(root, 'docs', 'nsw', 'residential-tenancy-agreement-form-2025-12.pdf')
const out = path.join(root, 'scripts', 'test-official-form-spike', 'widget-placements.json')

const buf = fs.readFileSync(template)
const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
const form = doc.getForm()
const pages = doc.getPages()

function widgetPageIndex(widget) {
  const ref = widget.ref
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (ref != null && annots.get(j) === ref) return i
    }
  }
  try {
    const p = widget.P?.()
    if (p) {
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].ref === p || pages[i].node === p) return i
      }
    }
  } catch {
    /* ignore */
  }
  return -1
}

const rows = []
for (const field of form.getFields()) {
  const name = field.getName()
  if (!name.startsWith('Text field')) continue
  try {
    const tf = form.getTextField(name)
    for (const widget of tf.acroField.getWidgets()) {
      const r = widget.getRectangle()
      rows.push({
        name,
        page: widgetPageIndex(widget),
        x: Math.round(r.x * 100) / 100,
        y: Math.round(r.y * 100) / 100,
        width: Math.round(r.width * 100) / 100,
        height: Math.round(r.height * 100) / 100,
      })
    }
  } catch {
    /* skip */
  }
}

rows.sort((a, b) => a.page - b.page || b.y - a.y)
fs.writeFileSync(out, JSON.stringify(rows, null, 2))
console.log('wrote', rows.length, 'widgets to', out)
for (const p of [0, 1, 2]) {
  console.log('\npage', p, 'count', rows.filter((r) => r.page === p).length)
}
