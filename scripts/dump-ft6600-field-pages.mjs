import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const buf = fs.readFileSync(path.join(root, 'docs/nsw/residential-tenancy-agreement-form-2025-12.pdf'))
const doc = await PDFDocument.load(buf)
const form = doc.getForm()

function widgetPageIndex(doc, widget) {
  const widgetRef = widget.ref
  for (let i = 0; i < doc.getPageCount(); i++) {
    const annots = doc.getPages()[i].node.Annots?.()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      if (widgetRef != null && annots.get(j) === widgetRef) return i
    }
  }
  return 0
}

const rows = []
for (const field of form.getFields()) {
  const name = field.getName()
  if (!name.startsWith('Text field')) continue
  try {
    const tf = form.getTextField(name)
    const widget = tf.acroField.getWidgets()[0]
    const r = widget.getRectangle()
    rows.push({ name, page: widgetPageIndex(doc, widget), y: r.y, x: r.x, w: r.width, h: r.height })
  } catch {
    /* skip */
  }
}

for (const page of [0, 1, 2]) {
  console.log('\n=== PDF page', page, '===')
  rows
    .filter((r) => r.page === page)
    .sort((a, b) => b.y - a.y)
    .forEach((r) => console.log(`y=${r.y.toFixed(0).padStart(4)} x=${r.x.toFixed(0).padStart(3)} ${r.name}`))
}
