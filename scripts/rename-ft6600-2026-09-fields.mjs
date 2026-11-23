/**
 * Build docs/nsw/ft6600-renamed.pdf from the 21 September 2026 Fair Trading form.
 * Renames AcroForm /T only. Page content streams stay byte-identical.
 *
 * Run: node scripts/rename-ft6600-2026-09-fields.mjs
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
  snapshotPageContents,
} from './lib/ft6600-pdf-rename-utils.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const officialPath = path.join(root, 'docs', 'nsw', 'residential-tenancy-agreement-form-2026-09.pdf')
const outPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed.pdf')
const fieldListPath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-field-list.json')
const fieldsTsPath = path.join(root, 'api', 'lib', 'documents', 'ft6600RenamedFields.ts')
const provenancePath = path.join(root, 'docs', 'nsw', 'ft6600-renamed-provenance.json')
const sourcePath = path.join(root, 'docs', 'nsw', 'source.json')

/** One widget. */
const SINGLE = {
  'Text field 1.1': 'agreement_made_on',
  'Text field 1.2': 'agreement_at',
  'Text field 1.3': 'made_on_spare_unused',
  'Text field 1.4': 'landlord_name_1',
  'Text field 1.5': 'landlord_name_2',
  'Text field 1.6': 'landlord_contact',
  'Text field 1.7': 'landlord_overseas',
  'Text field 1.8': 'landlord_phone_no_agent',
  'Text field 1.11': 'landlord_service_street',
  'Text field 1.12': 'landlord_service_suburb',
  'Text field 1.13': 'landlord_service_state',
  'Text field 1.14': 'landlord_service_postcode',
  'Text field 2.1': 'corp_name',
  'Text field 2.2': 'corp_address',
  'Text field 2.3': 'corp_suburb',
  'Text field 2.4': 'corp_state',
  'Text field 2.5': 'corp_postcode',
  'Text field 2.6': 'tenant_name_1',
  'Text field 2.7': 'tenant_name_2',
  'Text field 2.8': 'tenant_name_3',
  'Text field 2.9': 'tenant_all_others',
  'Text field 2.10': 'tenant_service_street',
  'Text field 2.11': 'tenant_service_suburb',
  'Text field 2.12': 'tenant_service_state',
  'Text field 2.13': 'tenant_service_postcode',
  'Text field 2.14': 'tenant_contact',
  'Text field 2.15': 'landlord_agent_name',
  'Text field 2.16': 'landlord_agent_address',
  'Text field 2.17': 'landlord_agent_suburb',
  'Text field 2.18': 'landlord_agent_state',
  'Text field 2.19': 'landlord_agent_postcode',
  'Text field 2.20': 'landlord_agent_contact',
  'Text field 2.21': 'tenant_agent_name',
  'Text field 2.22': 'tenant_agent_address',
  'Text field 2.23': 'tenant_agent_suburb',
  'Text field 2.24': 'tenant_agent_state',
  'Text field 2.25': 'tenant_agent_postcode',
  'Text field 2.26': 'tenant_agent_contact',
  'Text field 3.2': 'term_other_specify_text',
  'Text field 3.9': 'term_start_date',
  'Text field 3.10': 'term_end_date',
  'Text field 3.11': 'premises_address',
  'Text field 3.12': 'premises_inclusions',
  'Text field 3.13': 'rent_amount',
  'Text field 3.17': 'rent_other_frequency_text',
  'Text field 3.18': 'rent_due_day_text',
  'Text field 3.19': 'rent_first_payment_date',
  'Text field 3.23': 'rent_payment_details',
  'Text field 4.0': 'bond_amount',
  'Text field 3.8': 'bond_tenant_1_name',
  'Text field 3.3': 'bond_tenant_1_contribution',
  'Text field 3.4': 'bond_tenant_2_name',
  'Text field 3.5': 'bond_tenant_2_contribution',
  'Text field 3.6': 'bond_tenant_3_name',
  'Text field 3.7': 'bond_tenant_3_contribution',
  'Text field 4.4': 'max_occupants',
  'Text field 4.5': 'urgent_electrician_name',
  'Text field 4.6': 'urgent_electrician_phone',
  'Text field 4.7': 'urgent_plumber_name',
  'Text field 4.8': 'urgent_plumber_phone',
  'Text field 4.9': 'urgent_other_name',
  'Text field 4.10': 'urgent_other_phone',
  'Text field 4.18': 'smoke_battery_type_text',
  'Text field 4.21': 'smoke_hardwired_backup_type_text',
  'Text field 5.5': 'landlord_email_for_service',
  'Text field 5.8': 'tenant_email_for_service',
  'Text field 15.1': 'additional_terms_text',
  'Text field 15.2': 'pets_animal_description',
  'Text field 17.1': 'landlord_printed_name',
  'Text field 17.2': 'landlord_sig_day',
  'Text field 17.3': 'landlord_sig_month',
  'Text field 17.4': 'landlord_sig_year',
  'Text field 17.5': 'landlord_lis_sig_day',
  'Text field 17.6': 'landlord_lis_sig_month',
  'Text field 17.7': 'landlord_lis_sig_year',
  'Text field 17.8': 'tenant_1_printed_name',
  'Text field 17.9': 'tenant_1_sig_day',
  'Text field 17.10': 'tenant_1_sig_month',
  'Text field 17.11': 'tenant_1_sig_year',
  'Text field 17.12': 'tenant_2_printed_name',
  'Text field 17.13': 'tenant_2_sig_day',
  'Text field 17.14': 'tenant_2_sig_month',
  'Text field 17.15': 'tenant_2_sig_year',
  'Text field 18.1': 'tenant_3_printed_name',
  'Text field 18.2': 'tenant_3_sig_day',
  'Text field 18.3': 'tenant_3_sig_month',
  'Text field 18.4': 'tenant_3_sig_year',
  'Text field 18.5': 'tenant_4_printed_name',
  'Text field 18.6': 'tenant_4_sig_day',
  'Text field 18.7': 'tenant_4_sig_month',
  'Text field 18.8': 'tenant_4_sig_year',
  'Text field 18.9': 'tenant_tis_sig_day',
  'Text field 18.10': 'tenant_tis_sig_month',
  'Text field 18.11': 'tenant_tis_sig_year',
  'Signature Field 1': 'sig_landlord',
  'Signature Field 2': 'sig_landlord_lis',
  'Signature Field 3': 'sig_tenant_1',
  'Signature Field 4': 'sig_tenant_2',
  'Signature Field 5': 'sig_tenant_3',
  'Signature Field 6': 'sig_tenant_4',
  'Signature Field 7': 'sig_tenant_tis',
  'Check Box 4.11': 'smoke_hardwired_cb',
  'Check Box 4.12': 'smoke_battery_cb',
}

/** Visual order: top to bottom, then left to right. */
const MULTI = {
  'Check Box 3.1': [
    'term_6_months_cb',
    'term_12_months_cb',
    'term_2_years_cb',
    'term_3_years_cb',
    'term_5_years_cb',
    'term_other_cb',
    'term_periodic_cb',
  ],
  'Check Box 3.14': ['rent_paid_week_cb', 'rent_paid_fortnight_cb', 'rent_paid_other_freq_cb'],
  'Check Box 3.20': ['rent_paid_bank_cb', 'rent_paid_centrepay_cb', 'rent_paid_other_method_cb'],
  'Check Box 4.1': ['bond_paid_to_landlord_cb', 'bond_paid_to_agent_cb', 'bond_paid_to_rbo_cb'],
  'Check Box 4.8': ['water_usage_yes_cb', 'water_usage_no_cb'],
  'Check Box 4.9': ['electricity_embedded_yes_cb', 'electricity_embedded_no_cb'],
  'Check Box 4.10': ['gas_embedded_yes_cb', 'gas_embedded_no_cb'],
  'Check Box 4.13': ['smoke_battery_replaceable_yes_cb', 'smoke_battery_replaceable_no_cb'],
  'Check Box 4.19': [
    'smoke_hardwired_backup_replaceable_yes_cb',
    'smoke_hardwired_backup_replaceable_no_cb',
  ],
  'Check Box 4.22': ['smoke_owners_corp_responsible_yes_cb', 'smoke_owners_corp_responsible_no_cb'],
  'Check Box 5.1': ['strata_bylaws_yes_cb', 'strata_bylaws_no_cb'],
  'Check Box 5.3': ['landlord_eservice_yes_cb', 'landlord_eservice_no_cb'],
  'Check Box 5.6': ['tenant_eservice_yes_cb', 'tenant_eservice_no_cb'],
}

function visualOrder(a, b) {
  const dy = a.rect[1] - b.rect[1]
  if (Math.abs(dy) > 1.5) return dy
  return a.rect[0] - b.rect[0]
}

const officialBytes = fs.readFileSync(officialPath)
const officialSha = crypto.createHash('sha256').update(officialBytes).digest('hex')
const doc = await PDFDocument.load(officialBytes, { ignoreEncryption: true })
const contentsBefore = snapshotPageContents(doc)
const widgets = collectAllFieldWidgets(doc)

/** @type {Map<string, typeof widgets>} */
const byName = new Map()
for (const w of widgets) {
  const name = w.field.getName()
  const list = byName.get(name) ?? []
  list.push(w)
  byName.set(name, list)
}

/** @type {Array<{ page: number, rect: number[], correct_name: string }>} */
const correctedMap = []
const used = new Set()

for (const [name, group] of byName) {
  const ordered = [...group].sort(visualOrder)
  if (MULTI[name]) {
    const names = MULTI[name]
    if (names.length !== ordered.length) {
      throw new Error(`${name}: expected ${names.length} widgets, found ${ordered.length}`)
    }
    ordered.forEach((w, i) => {
      correctedMap.push({ page: w.page + 1, rect: w.rect, correct_name: names[i] })
      used.add(names[i])
    })
    continue
  }
  if (ordered.length !== 1) {
    throw new Error(`${name}: ${ordered.length} widgets and no multi map`)
  }
  const semantic = SINGLE[name]
  if (!semantic) throw new Error(`no semantic name for ${name}`)
  if (used.has(semantic)) throw new Error(`duplicate semantic name ${semantic}`)
  used.add(semantic)
  correctedMap.push({ page: ordered[0].page + 1, rect: ordered[0].rect, correct_name: semantic })
}

const knownSources = new Set([...Object.keys(SINGLE), ...Object.keys(MULTI)])
for (const name of byName.keys()) {
  if (!knownSources.has(name)) throw new Error(`unmapped source field ${name}`)
}

applyFt6600CorrectedRenames(doc, correctedMap)
assertPageContentsIdentical(contentsBefore, snapshotPageContents(doc))

const renamedBytesPass1 = await doc.save({ useObjectStreams: false })
const normalizedDoc = await PDFDocument.load(renamedBytesPass1, { ignoreEncryption: true })
const renamedBytes = await normalizedDoc.save({ useObjectStreams: false })
fs.writeFileSync(outPath, renamedBytes)

const renamedSha = crypto.createHash('sha256').update(renamedBytes).digest('hex')
const names = listFieldNames(await PDFDocument.load(renamedBytes, { ignoreEncryption: true }))
const unique = [...new Set(names)]
if (unique.length !== names.length) {
  throw new Error(`duplicate field names after rename`)
}
if (unique.length !== correctedMap.length) {
  throw new Error(`renamed ${unique.length} fields, map has ${correctedMap.length}`)
}

const fields = unique.sort().map((name) => ({ name }))
fs.writeFileSync(fieldListPath, JSON.stringify({ count: fields.length, fields }, null, 2) + '\n')

const tsKeys = unique
  .slice()
  .sort()
  .map((name) => `  ${name}: '${name}',`)
  .join('\n')
fs.writeFileSync(
  fieldsTsPath,
  `/**
 * Unique semantic AcroForm /T names on docs/nsw/ft6600-renamed.pdf.
 * Source: NSW Fair Trading FT6600 standard form from 21 September 2026 (FT6600_300726).
 * Regenerate: node scripts/rename-ft6600-2026-09-fields.mjs
 */
export const FT6600_RENAMED_FIELDS = {
${tsKeys}
} as const

export type Ft6600RenamedFieldName = (typeof FT6600_RENAMED_FIELDS)[keyof typeof FT6600_RENAMED_FIELDS]
`,
)

fs.writeFileSync(
  provenancePath,
  JSON.stringify(
    {
      officialPdf: 'docs/nsw/residential-tenancy-agreement-form-2026-09.pdf',
      officialSha256: officialSha,
      renamedPdf: 'docs/nsw/ft6600-renamed.pdf',
      renamedSha256: renamedSha,
      form: 'Standard form from 21 September 2026',
      publicationCode: 'FT6600_300726',
      pageCount: 20,
      fieldCount: unique.length,
      pageContentsByteIdentical: true,
      renameScript: 'scripts/rename-ft6600-2026-09-fields.mjs',
    },
    null,
    2,
  ) + '\n',
)

const source = {
  form: 'NSW FT6600 - Residential Tenancy Agreement',
  sourcePageUrl:
    'https://www.nsw.gov.au/housing-and-construction/rules/residential-tenancy-agreement-form',
  downloadUrl:
    'https://www.nsw.gov.au/sites/default/files/noindex/2026-09/residential-tenancy-agreement-form.pdf',
  fairTradingLastUpdated: '21 September 2026',
  publicationCode: 'FT6600_300726',
  sha256: officialSha,
  fileSizeBytes: officialBytes.length,
  pageCount: 20,
  storedAs: 'docs/nsw/residential-tenancy-agreement-form-2026-09.pdf',
  renamedWorkingTemplate: 'docs/nsw/ft6600-renamed.pdf',
  renamedWorkingTemplateSha256: renamedSha,
  renamedFieldCount: unique.length,
  renamedPageContentsByteIdentical: true,
  renameScript: 'scripts/rename-ft6600-2026-09-fields.mjs',
}
fs.writeFileSync(sourcePath, JSON.stringify(source, null, 2) + '\n')

console.log('fields', unique.length, 'sha', renamedSha)
