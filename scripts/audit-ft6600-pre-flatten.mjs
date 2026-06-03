/**
 * Pre-flatten field value audit for Quinn/Robert props.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFName } from 'pdf-lib'
import { buildNswResidentialTenancyAgreementPropsFromBooking } from '../api/lib/documents/buildNswFt6600AgreementProps.ts'
import {
  loadOfficialNswFt6600Template,
  prepareOfficialNswFt6600ScheduleForFlatten,
} from '../api/lib/documents/officialNswFt6600Fill.ts'
import { FT6600_RENAMED_FIELDS as F } from '../api/lib/documents/ft6600RenamedFields.ts'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const QUINN_ROBERT_BOOKING_ROWS = {
  documentId: 'audit',
  generatedAt: '03/06/2026, 10:00:00 am',
  booking: { move_in_date: '2026-06-10', end_date: '2026-12-10', lease_length: '6 months', weekly_rent: 400, notes: null },
  landlordProfile: {
    first_name: 'Quinn', last_name: 'Lee', full_name: 'Quinn Lee', email: 'quinniele90@gmail.com', phone: '+61410025719',
    address: '18 Malvina Street', suburb: 'Ryde', state: 'NSW', postcode: '2112', company_name: null,
  },
  studentProfile: {
    first_name: 'Robert', last_name: 'Saltalamacchia', full_name: 'Robert Saltalamacchia', email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308', workplace_address: null, workplace_suburb: null, workplace_state: null, workplace_postcode: null,
  },
  property: {
    address: 'Unit 406/311 Hume Highway', suburb: 'Liverpool', state: 'NSW', postcode: '2170', max_occupants: 2, bond: 800,
    property_type: 'private_room_landlord_off_site', room_type: 'Private room', furnished: true, linen_supplied: true,
    weekly_cleaning_service: false, property_features: [{ features: { name: 'Bills included' } }],
  },
  bankDetails: { bsb: '939200', accountNumber: '823175945', accountName: 'QUINNVESTMENTS PTY LTD', bankName: 'Bank' },
}

function readV(dict) {
  const v = dict.get(PDFName.of('V'))
  if (!v) return '(none)'
  if ('decodeText' in v && typeof v.decodeText === 'function') return v.decodeText()
  return v.toString()
}

const props = buildNswResidentialTenancyAgreementPropsFromBooking(QUINN_ROBERT_BOOKING_ROWS)
const doc = await loadOfficialNswFt6600Template()
const { assignments } = await prepareOfficialNswFt6600ScheduleForFlatten(doc, props)
const form = doc.getForm()

console.log('assignments', assignments.length)
const mustCheck = [
  F.term_6_months_cb,
  F.rent_paid_week_cb,
  F.rent_paid_bank_cb,
  F.bond_paid_to_rbo_cb,
  F.water_usage_no_cb,
  F.electricity_embedded_no_cb,
  F.gas_embedded_no_cb,
]
const mustOff = [F.smoke_battery_cb, F.landlord_eservice_yes_cb, F.tenant_eservice_yes_cb]

for (const n of mustCheck) {
  const f = form.getCheckBox(n)
  console.log('CHECK', n, 'isChecked=', f.isChecked(), 'V=', readV(f.acroField.dict))
}
for (const n of mustOff) {
  const f = form.getCheckBox(n)
  console.log('OFF', n, 'isChecked=', f.isChecked(), 'V=', readV(f.acroField.dict))
}
for (const n of [F.landlord_name_1, F.rent_amount]) {
  const f = form.getTextField(n)
  console.log('TEXT', n, 'getText=', JSON.stringify(f.getText()), 'V=', readV(f.acroField.dict))
}

let emptyText = 0
for (const [name, value] of assignments) {
  try {
    const f = form.getTextField(name)
    const t = f.getText()
    const v = readV(f.acroField.dict)
    if (value && !t && v === '(none)') emptyText++
  } catch {
    /* checkbox */
  }
}
console.log('assigned text fields with empty getText/V:', emptyText)

doc.getForm().flatten()
const bytes = await doc.save({ useObjectStreams: false })
console.log('post-flatten bytes', bytes.length, 'fields left', doc.getForm().getFields().length)
