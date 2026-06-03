/**
 * Count Widget annotations before/after flatten.
 */
import { PDFName, PDFDict } from 'pdf-lib'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from '../api/lib/documents/buildNswFt6600AgreementProps.ts'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from '../api/lib/documents/officialNswFt6600Fill.ts'

function countWidgets(doc) {
  const ctx = doc.context
  let w = 0
  for (const page of doc.getPages()) {
    const annots = page.node.Annots?.()
    if (!annots) continue
    for (let i = 0; i < annots.size(); i++) {
      const d = ctx.lookup(annots.get(i), PDFDict)
      if (d.get(PDFName.of('Subtype'))?.toString() === '/Widget') w++
    }
  }
  return w
}

const rows = {
  documentId: 't',
  generatedAt: '03/06/2026, 10:00:00 am',
  booking: { move_in_date: '2026-06-10', end_date: '2026-12-10', lease_length: '6 months', weekly_rent: 400, notes: null },
  landlordProfile: {
    first_name: 'Q', last_name: 'L', full_name: 'Quinn Lee', email: 'q@e.com', phone: '+614',
    address: '18 Malvina Street', suburb: 'Ryde', state: 'NSW', postcode: '2112', company_name: null,
  },
  studentProfile: {
    first_name: 'R', last_name: 'S', full_name: 'Robert Saltalamacchia', email: 'r@e.com', phone: '+615',
    workplace_address: null, workplace_suburb: null, workplace_state: null, workplace_postcode: null,
  },
  property: {
    address: 'Unit 406/311 Hume Highway', suburb: 'Liverpool', state: 'NSW', postcode: '2170', max_occupants: 2, bond: 800,
    property_type: 'private_room_landlord_off_site', room_type: 'Private room', furnished: true, linen_supplied: true,
    weekly_cleaning_service: false, property_features: [{ features: { name: 'Bills included' } }],
  },
  bankDetails: { bsb: '939200', accountNumber: '823175945', accountName: 'QUINNVESTMENTS PTY LTD', bankName: 'Bank' },
}

const props = buildNswResidentialTenancyAgreementPropsFromBooking(rows)
const doc = await loadOfficialNswFt6600Template()
console.log('before fill widgets', countWidgets(doc))
await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
console.log('after fill widgets', countWidgets(doc))
doc.getForm().flatten()
console.log('after flatten widgets', countWidgets(doc), 'acro fields', doc.getForm().getFields().length)
