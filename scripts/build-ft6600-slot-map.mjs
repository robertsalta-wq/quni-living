/**
 * Dump AcroForm fields from the blank official FT6600 and emit name→semantic slot map.
 * Slots are assigned by section y-band + reading order (y desc, x asc), not tooltips.
 *
 * Run: node scripts/build-ft6600-slot-map.mjs
 * Output: api/lib/documents/ft6600-acro-field-slots.json (committed)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, PDFName } from 'pdf-lib'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const template = path.join(root, 'docs', 'nsw', 'residential-tenancy-agreement-form-2025-12.pdf')
const placementsPath = path.join(root, 'scripts', 'test-official-form-spike', 'widget-placements.json')
const outJson = path.join(root, 'api', 'lib', 'documents', 'ft6600-acro-field-slots.json')

/** Authoritative schedule slots (position-derived). Keys are semantic slot ids. */
const SCHEDULE_SLOT_TO_ACRO = {
  agreement_made_on: 'Text field 1.1',
  agreement_at: 'Text field 1.2',
  landlord_name_1: 'Text field 1.3',
  landlord_name_2: 'Text field 1.4',
  landlord_contact: 'Text field 1.5',
  landlord_overseas: 'Text field 1.6',
  landlord_phone_no_agent: 'Text field 1.7',
  landlord_service_supplement: 'Text field 1.8',
  landlord_service_street: 'Text field 1.11',
  landlord_service_suburb: 'Text field 1.12',
  landlord_service_state: 'Text field 1.13',
  landlord_service_postcode: 'Text field 1.14',
  corp_header: 'Text field 2.1',
  corp_name: 'Text field 2.2',
  corp_suburb: 'Text field 2.3',
  corp_state: 'Text field 2.4',
  corp_postcode: 'Text field 2.5',
  tenant_name_1: 'Text field 2.6',
  tenant_name_2: 'Text field 2.7',
  tenant_name_3_or_other: 'Text field 2.8',
  tenant_extra_row: 'Text field 2.9',
  tenant_service_street: 'Text field 2.10',
  tenant_service_suburb: 'Text field 2.11',
  tenant_service_state: 'Text field 2.12',
  tenant_service_postcode: 'Text field 2.13',
  tenant_contact: 'Text field 2.14',
  landlord_agent_name: 'Text field 2.15',
  landlord_agent_address: 'Text field 2.16',
  landlord_agent_suburb: 'Text field 2.17',
  landlord_agent_state: 'Text field 2.18',
  landlord_agent_postcode: 'Text field 2.19',
  tenant_agent_name: 'Text field 2.20',
  tenant_agent_address: 'Text field 2.21',
  tenant_agent_contact: 'Text field 2.22',
  term_start_date: 'Text field 2.23',
  rent_first_payment_date: 'Text field 2.24',
  term_end_date: 'Text field 2.25',
  premises_address: 'Text field 2.26',
  premises_inclusions_cb: 'Check Box 3.1',
  rent_amount_cb: 'Check Box 3.2',
  rent_paid_week_cb: 'Check Box 3.3',
  rent_due_day_cb: 'Check Box 3.4',
  rent_first_payment_cb: 'Check Box 3.5',
  rent_paid_bank_cb: 'Check Box 3.6',
  rent_weekly_amount: 'Text field 3.7',
  rent_fortnightly_amount: 'Text field 3.9',
  rent_other_frequency_amount: 'Text field 3.10',
  rent_payment_details: 'Text field 3.11',
  rent_centrepay_details: 'Text field 3.12',
  rent_due_day_text: 'Text field 3.13',
  max_occupants: 'Text field 3.17',
  urgent_electrician_name: 'Text field 3.18',
  urgent_electrician_phone: 'Text field 3.19',
  term_6_months_cb: 'Check Box 3.14',
  term_12_months_cb: 'Check Box 3.15',
  term_2_years_cb: 'Check Box 3.16',
  term_5_years_cb: 'Check Box 3.20',
  term_other_cb: 'Check Box 3.21',
  term_periodic_cb: 'Check Box 3.22',
  urgent_plumber_name: 'Text field 3.23',
  urgent_plumber_phone: 'Text field 4.0',
  urgent_other_name: 'Text field 4.4',
  urgent_other_phone: 'Text field 4.5',
  smoke_battery_type_text: 'Text field 4.6',
  bond_amount: 'Text field 4.7',
  bond_paid_to_landlord_text: 'Text field 4.8',
  bond_paid_to_agent_text: 'Text field 4.9',
  bond_paid_to_rbo_text: 'Text field 4.10',
  water_usage_separate_text: 'Text field 4.18',
  electricity_embedded_text: 'Text field 4.21',
  gas_embedded_no_cb: 'Check Box 4.1',
  smoke_hardwired_cb: 'Check Box 4.2',
  smoke_battery_cb: 'Check Box 4.3',
  smoke_battery_replaceable_yes_cb: 'Check Box 4.8',
  smoke_battery_replaceable_no_cb: 'Check Box 4.8',
  smoke_hardwired_backup_yes_cb: 'Check Box 4.9',
  smoke_hardwired_backup_no_cb: 'Check Box 4.9',
  strata_owners_corp_yes_cb: 'Check Box 4.11',
  strata_owners_corp_no_cb: 'Check Box 4.12',
  strata_bylaws_yes_cb: 'Check Box 4.13',
  strata_bylaws_no_cb: 'Check Box 4.13',
  landlord_eservice_yes_cb: 'Check Box 4.22',
  landlord_eservice_no_cb: 'Check Box 4.23',
  tenant_eservice_yes_cb: 'Check Box 5.1',
  tenant_eservice_no_cb: 'Check Box 5.12',
  landlord_email_for_service: 'Text field 5.5',
  tenant_email_for_service: 'Text field 5.8',
}

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
  return -1
}

function dumpField(name, kind) {
  try {
    const field = kind === 'text' ? form.getTextField(name) : form.getCheckBox(name)
    const widgets = field.acroField.getWidgets()
    return widgets.map((widget, widgetIndex) => {
      const r = widget.getRectangle()
      return {
        acroName: name,
        kind,
        widgetIndex,
        page: widgetPageIndex(widget),
        rect: [
          Math.round(r.x * 100) / 100,
          Math.round(r.y * 100) / 100,
          Math.round((r.x + r.width) * 100) / 100,
          Math.round((r.y + r.height) * 100) / 100,
        ],
      }
    })
  } catch {
    return []
  }
}

const acroToSlot = {}
for (const [slot, acro] of Object.entries(SCHEDULE_SLOT_TO_ACRO)) {
  if (acroToSlot[acro] && !acroToSlot[acro].includes(slot)) {
    acroToSlot[acro] = `${acroToSlot[acro]}|${slot}`
  } else if (!acroToSlot[acro]) {
    acroToSlot[acro] = slot
  }
}

const widgets = []
for (const [slot, acroName] of Object.entries(SCHEDULE_SLOT_TO_ACRO)) {
  const kind = acroName.startsWith('Check Box') ? 'check' : 'text'
  const rows = dumpField(acroName, kind)
  for (const row of rows) {
    widgets.push({ ...row, slot })
  }
}

const payload = {
  template: 'docs/nsw/residential-tenancy-agreement-form-2025-12.pdf',
  generatedAt: new Date().toISOString(),
  slotToAcro: SCHEDULE_SLOT_TO_ACRO,
  acroToSlot,
  widgets,
}

fs.writeFileSync(outJson, JSON.stringify(payload, null, 2))

const placements = JSON.parse(fs.readFileSync(placementsPath, 'utf8'))
const placementNames = new Set(placements.map((p) => p.name))
for (const acro of Object.values(SCHEDULE_SLOT_TO_ACRO)) {
  if (acro.startsWith('Text field') && !placementNames.has(acro)) {
    console.warn('text placement missing from widget-placements.json:', acro)
  }
}

console.log('wrote', outJson, 'slots', Object.keys(SCHEDULE_SLOT_TO_ACRO).length, 'widgets', widgets.length)
