/**
 * Compare widget/annotation counts: blank template vs filled draft.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function analyze(label, pdfPath) {
  const buf = fs.readFileSync(pdfPath)
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false })
  const ctx = doc.context

  let widget = 0
  let sig = 0
  let other = 0
  const byPage = doc.getPages().map(() => ({ widget: 0, sig: 0, other: 0 }))

  for (let pi = 0; pi < doc.getPageCount(); pi++) {
    const annots = doc.getPages()[pi].node.Annots?.()
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      const d = ctx.lookup(annots.get(i), PDFDict)
      const subtype = d.get(PDFName.of('Subtype'))?.toString() ?? '?'
      if (subtype === '/Widget') {
        widget++
        byPage[pi].widget++
        const ft = d.get(PDFName.of('FT'))?.toString()
        if (ft === '/Sig') {
          sig++
          byPage[pi].sig++
        }
      } else {
        other++
        byPage[pi].other++
      }
    }
  }

  let acroFields = 0
  try {
    acroFields = doc.getForm().getFields().length
  } catch {
    acroFields = 0
  }

  console.log('\n===', label, '===')
  console.log('path', pdfPath)
  console.log('acroForm root fields (pdf-lib getFields):', acroFields)
  console.log('page Widget annots:', widget, '(Sig widgets:', sig + ')')
  console.log('non-Widget annots:', other)
  console.log('total annots:', widget + other)
  console.log('pages with widgets:', byPage.filter((p) => p.widget > 0).map((p, i) => `${i + 1}:${p.widget}`).join(', '))
}

await analyze('blank renamed template', path.join(root, 'docs/nsw/ft6600-renamed.pdf'))
await analyze('filled flattened draft', path.join(root, 'scripts/test-official-form-spike/quinn-robert-ft6600-filled.pdf'))

console.log('\nNote: flatten removes AcroForm and merges field appearances into page content.')
console.log('Signature widgets (7) + schedule widgets (124) ≈ 131; remaining annots may be links or partial flatten residue.')
