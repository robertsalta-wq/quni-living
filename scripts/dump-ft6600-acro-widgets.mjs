import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { findTextFieldWidgetPageIndex } from '../api/lib/documents/officialNswFt6600BurnIn.ts'

const template = join(process.cwd(), 'docs', 'nsw', 'ft6600-renamed.pdf')
const buf = readFileSync(template)
const doc = await PDFDocument.load(buf, { ignoreEncryption: true })

const names = [
  'sig_landlord',
  'sig_landlord_lis',
  'sig_tenant_1',
  'sig_tenant_2',
  'sig_tenant_tis',
  'landlord_sig_day',
  'landlord_sig_month',
  'landlord_sig_year',
  'landlord_lis_sig_day',
  'landlord_lis_sig_month',
  'landlord_lis_sig_year',
  'tenant_1_sig_day',
  'tenant_1_sig_month',
  'tenant_1_sig_year',
  'tenant_2_sig_day',
  'tenant_2_sig_month',
  'tenant_2_sig_year',
  'tenant_tis_sig_day',
  'tenant_tis_sig_month',
  'tenant_tis_sig_year',
]

for (const field of doc.getForm().getFields()) {
  const name = field.getName()
  if (!names.includes(name)) continue
  for (const widget of field.acroField.getWidgets()) {
    const r = widget.getRectangle()
    console.log(
      JSON.stringify({
        name,
        page: findTextFieldWidgetPageIndex(doc, widget),
        x: Math.round(r.x * 10) / 10,
        y: Math.round(r.y * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
      }),
    )
  }
}
